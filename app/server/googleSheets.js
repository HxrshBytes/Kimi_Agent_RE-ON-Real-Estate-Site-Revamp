import { google } from 'googleapis'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1IeQ2pmflrQhI_gPpSORVSG2TumQ-YPqnsf1mJwPzxwg'
const CONTACTS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_CONTACTS_SPREADSHEET_ID || '1GyHlsAH2sns01P6KZ-eQ4xxMUYXnuFjTl1vPnEsgtQ8'

// Load service account credentials: env var first (Vercel), then JSON file (local)
let credentials = null
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
    console.log('[Google Sheets] Loaded credentials from env var')
  } catch (err) {
    console.warn('[Google Sheets] Failed to parse GOOGLE_CREDENTIALS_JSON:', err.message)
  }
}
if (!credentials) {
  try {
    const credPath = join(__dirname, 'google-credentials.json')
    credentials = JSON.parse(readFileSync(credPath, 'utf8'))
    console.log('[Google Sheets] Loaded credentials from JSON file')
  } catch (err) {
    console.warn('[Google Sheets] No credentials found (env var or file)')
  }
}

// Column headers matching property fields
const HEADERS = [
  '_id', 'id', 'name', 'location', 'price', 'type', 'status',
  'possessionDate', 'area', 'reraNumber', 'developer', 'description',
  'mapLink', 'highlights', 'connectivity', 'images', 'videos',
  'createdBy', 'createdAt', 'updatedBy', 'updatedAt'
]

// Column headers for contacts/leads CRM
const CONTACT_HEADERS = [
  '_id', 'name', 'email', 'phone', 'propertyName', 'propertyId',
  'propertyLocation', 'budget', 'message', 'type', 'source',
  'preferredDate', 'status', 'notes', 'assignedTo',
  'submittedAt', 'updatedAt'
]

let sheetsClient = null
let sheetsEnabled = false

/**
 * Initialize the Google Sheets API client using service account credentials.
 * Returns null if credentials are missing — sync will be silently skipped.
 */
async function getSheets() {
  if (sheetsClient) return sheetsClient
  if (!SPREADSHEET_ID || !credentials) {
    console.warn('[Google Sheets] Missing credentials or spreadsheet ID — sync disabled')
    return null
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const client = await auth.getClient()
    sheetsClient = google.sheets({ version: 'v4', auth: client })
    sheetsEnabled = true
    console.log('[Google Sheets] ✅ Authenticated successfully')
    return sheetsClient
  } catch (err) {
    console.error('[Google Sheets] ❌ Auth failed:', err.message)
    return null
  }
}

/**
 * Convert a property document into a flat row array matching HEADERS order.
 * Array fields (highlights, connectivity, images, videos) are pipe-separated.
 */
function propertyToRow(property) {
  return HEADERS.map((key) => {
    const val = property[key]
    if (val === undefined || val === null) return ''
    if (Array.isArray(val)) return val.join(' | ')
    if (typeof val === 'object') return String(val)
    return String(val)
  })
}

/**
 * Ensure the sheet has the correct header row.
 * Generic: accepts spreadsheetId and headers array.
 */
async function ensureHeaders(sheets, spreadsheetId, headers) {
  try {
    const lastCol = String.fromCharCode(64 + headers.length) // A=65, so 64+len
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Sheet1!A1:${lastCol}1`,
    })
    const existingHeaders = res.data.values?.[0] || []

    const headersMatch = headers.every((h, i) => existingHeaders[i] === h)
    if (headersMatch) return

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A1:${lastCol}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    })
    console.log(`[Google Sheets] Headers set for spreadsheet ${spreadsheetId.substring(0, 8)}...`)
  } catch (err) {
    console.error('[Google Sheets] Error setting headers:', err.message)
  }
}

/**
 * Find the row number (1-indexed) that matches a given _id in column A.
 * Generic: accepts spreadsheetId.
 */
async function findRowByMongoId(sheets, spreadsheetId, mongoId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:A',
    })
    const rows = res.data.values || []
    const idStr = String(mongoId)
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === idStr) {
        return i + 1
      }
    }
  } catch (err) {
    console.error('[Google Sheets] Error finding row:', err.message)
  }
  return -1
}

/**
 * Convert a document to a flat row array given a list of headers.
 */
function docToRow(doc, headers) {
  return headers.map((key) => {
    const val = doc[key]
    if (val === undefined || val === null) return ''
    if (key === 'assignedTo' && typeof val === 'object') {
      return val.name ? `${val.name} (${val.phone || ''})` : (val.callerId || JSON.stringify(val))
    }
    if (Array.isArray(val)) return val.join(' | ')
    if (typeof val === 'object') return val.name || String(val)
    return String(val)
  })
}

/**
 * Sync a single property to Google Sheets.
 * - If a row with the same _id exists, update it.
 * - Otherwise, append a new row.
 * This is called after property create/update operations.
 */
export async function syncPropertyToSheet(property) {
  try {
    const sheets = await getSheets()
    if (!sheets) return

    await ensureHeaders(sheets, SPREADSHEET_ID, HEADERS)

    const mongoId = String(property._id)
    const rowData = docToRow(property, HEADERS)
    const lastCol = String.fromCharCode(64 + HEADERS.length)
    const rowIndex = await findRowByMongoId(sheets, SPREADSHEET_ID, mongoId)

    if (rowIndex > 1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A${rowIndex}:${lastCol}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      })
      console.log(`[Google Sheets] Updated row ${rowIndex} for property "${property.name}"`)
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sheet1!A:${lastCol}`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [rowData] },
      })
      console.log(`[Google Sheets] Appended new row for property "${property.name}"`)
    }
  } catch (err) {
    console.error('[Google Sheets] Property sync error:', err.message)
  }
}

/**
 * Delete a property's row from Google Sheets by its MongoDB _id.
 * Finds the row, then deletes it using the batchUpdate API.
 */
/**
 * Generic delete row from a spreadsheet by MongoDB _id.
 */
async function deleteRowFromSheet(spreadsheetId, mongoId, label) {
  try {
    const sheets = await getSheets()
    if (!sheets) return

    const idStr = String(mongoId)
    const rowIndex = await findRowByMongoId(sheets, spreadsheetId, idStr)

    if (rowIndex <= 1) {
      console.log(`[Google Sheets] No row found for _id ${idStr} to delete (${label})`)
      return
    }

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
    const sheetId = spreadsheet.data.sheets[0].properties.sheetId

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        }],
      },
    })
    console.log(`[Google Sheets] Deleted ${label} row ${rowIndex} for _id ${idStr}`)
  } catch (err) {
    console.error(`[Google Sheets] ${label} delete error:`, err.message)
  }
}

export async function deletePropertyFromSheet(mongoId) {
  return deleteRowFromSheet(SPREADSHEET_ID, mongoId, 'property')
}

/**
 * Full sync: Clear the entire sheet and re-populate from all MongoDB properties.
 * Called via the /properties/sync-sheets endpoint.
 */
export async function fullSyncToSheet(db) {
  try {
    const sheets = await getSheets()
    if (!sheets) {
      return { success: false, error: 'Google Sheets not configured or auth failed' }
    }

    // Fetch all properties from MongoDB
    const properties = await db.collection('properties').find({}).toArray()

    // Clear existing data (keep sheet)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1',
    })

    // Write headers + all property rows
    const rows = [HEADERS, ...properties.map(propertyToRow)]

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    })

    console.log(`[Google Sheets] ✅ Full sync complete — ${properties.length} properties written`)
    return { success: true, count: properties.length }
  } catch (err) {
    console.error('[Google Sheets] Full sync error:', err.message)
    return { success: false, error: err.message }
  }
}

// ═══════════════════════════════════════════════
// CONTACTS / LEADS SYNC
// ═══════════════════════════════════════════════

/**
 * Sync a single contact/lead to Google Sheets (contacts spreadsheet).
 */
export async function syncContactToSheet(contact) {
  try {
    const sheets = await getSheets()
    if (!sheets) return

    await ensureHeaders(sheets, CONTACTS_SPREADSHEET_ID, CONTACT_HEADERS)

    const mongoId = String(contact._id)
    const rowData = docToRow(contact, CONTACT_HEADERS)
    const lastCol = String.fromCharCode(64 + CONTACT_HEADERS.length)
    const rowIndex = await findRowByMongoId(sheets, CONTACTS_SPREADSHEET_ID, mongoId)

    if (rowIndex > 1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: CONTACTS_SPREADSHEET_ID,
        range: `Sheet1!A${rowIndex}:${lastCol}${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      })
      console.log(`[Google Sheets] Updated contact row ${rowIndex} for "${contact.name}"`)
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: CONTACTS_SPREADSHEET_ID,
        range: `Sheet1!A:${lastCol}`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [rowData] },
      })
      console.log(`[Google Sheets] Appended new contact row for "${contact.name}"`)
    }
  } catch (err) {
    console.error('[Google Sheets] Contact sync error:', err.message)
  }
}

/**
 * Delete a contact's row from the contacts spreadsheet.
 */
export async function deleteContactFromSheet(mongoId) {
  return deleteRowFromSheet(CONTACTS_SPREADSHEET_ID, mongoId, 'contact')
}

/**
 * Full sync: Clear the contacts sheet and re-populate from all MongoDB contacts.
 */
export async function fullContactsSyncToSheet(db) {
  try {
    const sheets = await getSheets()
    if (!sheets) {
      return { success: false, error: 'Google Sheets not configured or auth failed' }
    }

    const contacts = await db.collection('contacts').find({}).sort({ submittedAt: -1 }).toArray()

    await sheets.spreadsheets.values.clear({
      spreadsheetId: CONTACTS_SPREADSHEET_ID,
      range: 'Sheet1',
    })

    const rows = [CONTACT_HEADERS, ...contacts.map(c => docToRow(c, CONTACT_HEADERS))]

    await sheets.spreadsheets.values.update({
      spreadsheetId: CONTACTS_SPREADSHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    })

    console.log(`[Google Sheets] ✅ Contacts full sync complete — ${contacts.length} contacts written`)
    return { success: true, count: contacts.length }
  } catch (err) {
    console.error('[Google Sheets] Contacts full sync error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Check if Google Sheets sync is enabled and credentials are present.
 */
export function isSheetsEnabled() {
  return !!(SPREADSHEET_ID && credentials)
}

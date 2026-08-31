import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backups directory inside server/backups/properties
const BACKUPS_DIR = path.join(__dirname, 'backups', 'properties');

function ensureBackupDirExists() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

/**
 * Creates an automated backup of properties in MongoDB.
 * Saves a JSON file to server/backups/properties/ and returns the backup payload.
 *
 * @param {object} db - MongoDB database instance
 * @param {object} options - Options containing triggerReason, user, filterQuery, specificItems
 * @returns {Promise<{ success: boolean, filename: string, filePath: string, count: number, backupData: object }>}
 */
export async function createPropertiesBackup(db, options = {}) {
  try {
    ensureBackupDirExists();

    const {
      triggerReason = 'manual',
      user = 'superadmin',
      filterQuery = {},
      specificItems = null,
    } = options;

    let propertiesToBackup = [];

    if (Array.isArray(specificItems) && specificItems.length > 0) {
      propertiesToBackup = specificItems;
    } else {
      // Query database
      propertiesToBackup = await db.collection('properties').find(filterQuery).toArray();
    }

    const totalCount = await db.collection('properties').countDocuments();
    const timestamp = new Date();
    const isoString = timestamp.toISOString();
    const formattedDate = isoString.replace(/[:.]/g, '-');
    const filename = `backup-properties-${formattedDate}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    const backupData = {
      backupMetadata: {
        type: 'properties_collection_backup',
        version: '1.0',
        createdAt: isoString,
        timestampMs: timestamp.getTime(),
        triggerReason,
        triggeredBy: user,
        totalCollectionCount: totalCount,
        backedUpCount: propertiesToBackup.length,
      },
      properties: propertiesToBackup,
    };

    // Save to disk
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`[DB Backup] ✅ Properties backup saved to ${filePath} (${propertiesToBackup.length} properties)`);

    return {
      success: true,
      filename,
      filePath,
      count: propertiesToBackup.length,
      backupData,
    };
  } catch (error) {
    console.error('[DB Backup] ❌ Error creating properties backup:', error);
    return {
      success: false,
      error: error.message,
      backupData: null,
    };
  }
}

/**
 * Lists all existing properties backup files from disk.
 */
export function listPropertiesBackups() {
  try {
    ensureBackupDirExists();
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((file) => file.endsWith('.json'))
      .sort()
      .reverse();

    return files.map((file) => {
      const fullPath = path.join(BACKUPS_DIR, file);
      const stats = fs.statSync(fullPath);
      return {
        filename: file,
        sizeBytes: stats.size,
        createdAt: stats.mtime.toISOString(),
      };
    });
  } catch (error) {
    console.error('[DB Backup] ❌ Error listing backups:', error);
    return [];
  }
}

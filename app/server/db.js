import crypto from 'crypto'
if (!globalThis.crypto) {
  globalThis.crypto = crypto
}

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://studiessameer3_db_user:FQ8SDKO8gpnrdYHJ@cluster0111.fdeg09e.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0111'
const DB_NAME = process.env.DB_NAME || 'sample_mflix'

let cachedClient = null
let cachedDb = null

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  })

  await client.connect()
  const db = client.db(DB_NAME)

  cachedClient = client
  cachedDb = db

  await seedDatabaseIfEmpty(db)

  return { client, db }
}

export const defaultProperties = []

export const defaultBlogs = []

import { hashPassword } from './auth.js'

export const defaultAdmins = [
  { username: 'superadmin', role: 'superadmin', passwordHash: hashPassword('!@#$%Reonadmin786') },
]

export async function seedDatabaseIfEmpty(db) {
  try {
    const propsCol = db.collection('properties')
    const propsCount = await propsCol.countDocuments()
    if (propsCount === 0 && defaultProperties.length > 0) {
      await propsCol.insertMany(defaultProperties)
      console.log('[MongoDB] Seeded default properties.')
    }

    const blogsCol = db.collection('blogs')
    const blogsCount = await blogsCol.countDocuments()
    if (blogsCount === 0 && defaultBlogs.length > 0) {
      await blogsCol.insertMany(defaultBlogs)
      console.log('[MongoDB] Seeded default blogs.')
    }

    const adminsCol = db.collection('admins')
    const superadminDoc = await adminsCol.findOne({ username: 'superadmin' })
    if (!superadminDoc) {
      await adminsCol.insertOne(defaultAdmins[0])
      console.log('[MongoDB] Seeded superadmin with hashed password.')
    } else if (!superadminDoc.passwordHash) {
      await adminsCol.updateOne(
        { username: 'superadmin' },
        { $set: { passwordHash: hashPassword('!@#$%Reonadmin786') } }
      )
      console.log('[MongoDB] Updated superadmin with salted password hash.')
    }
  } catch (err) {
    console.error('[MongoDB] Seeding error:', err)
  }
}

import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing')
  process.exit(1)
}

console.log('✅ DATABASE_URL loaded successfully')

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})
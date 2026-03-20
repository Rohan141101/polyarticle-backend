import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load backend .env explicitly
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing in backend/.env')
  process.exit(1)
}

console.log('✅ DATABASE_URL loaded successfully')

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})
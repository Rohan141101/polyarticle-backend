import { Pool } from 'pg'
import dotenv from 'dotenv'
import { logger } from '../utils/logger'

dotenv.config()

if (!process.env.DATABASE_URL) {
  logger.error('❌ DATABASE_URL is missing')
  process.exit(1)
}

logger.log('✅ DATABASE_URL loaded successfully')

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

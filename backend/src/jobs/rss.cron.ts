import cron from 'node-cron'
import { ingestRSSFeeds } from '../services/rssIngest.service'

let isRunning = false

async function runIngestion() {
  if (isRunning) return
  isRunning = true
  try {
    await ingestRSSFeeds()
  } catch {
  } finally {
    isRunning = false
  }
}

export function startRSSCron() {
  cron.schedule('0 */2 * * *', runIngestion)
  runIngestion()
}
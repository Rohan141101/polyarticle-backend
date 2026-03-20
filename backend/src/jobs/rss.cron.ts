import cron from "node-cron"
import { ingestRSSFeeds } from "../services/rssIngest.service"

let isRunning = false

export function startRSSCron() {
  console.log("🕒 RSS Cron initialized (every 3 hours)")

  ;(async () => {
    console.log("🚀 Initial RSS ingestion...")
    try {
      const result = await ingestRSSFeeds()
      console.log("✅ Initial ingestion done:", result)
    } catch (err) {
      console.error("❌ Initial ingestion failed:", err)
    }
  })()


  cron.schedule("0 */3 * * *", async () => {
    if (isRunning) {
      console.log("⏭️ Skipping cron (previous run still active)")
      return
    }

    isRunning = true

    console.log("🔄 Running scheduled RSS ingestion...")

    try {
      const result = await ingestRSSFeeds()
      console.log("✅ Scheduled ingestion done:", result)
    } catch (err) {
      console.error("❌ Scheduled ingestion failed:", err)
    } finally {
      isRunning = false
    }
  })
}
import { Queue } from "bullmq"
import { redisConnection } from "./queue/redis"
import { pool } from "./db"

const embeddingQueue = new Queue("embedding-queue", {
  connection: redisConnection,
})

export async function backfillMissingArticles() {
  console.log("🔍 Checking for articles missing summaries...")

  const { rows } = await pool.query(`
    SELECT id
    FROM articles
    WHERE short_summary IS NULL
       OR embedding IS NULL
  `)

  console.log(`📦 Found ${rows.length} articles to process`)

  for (const row of rows) {
    await embeddingQueue.add("embed-article", {
      articleId: row.id,
    })
  }

  console.log("✅ Backfill jobs added")
}
import { Worker } from "bullmq"
import { redisConnection } from "../queue/redis"
import { pool } from "../db"
import { fetchArticleContent } from "../utils/fetchArticleContent"
import { embeddingQueue } from "../queue/embedding.queue"

console.log("📰 Content worker started")

const worker = new Worker(
  "content-queue",
  async job => {
    const { articleId, url } = job.data

    console.log("🧾 Fetching full article for:", articleId)

    try {
      const content = await fetchArticleContent(url)

      if (!content || content.length < 300) {
        console.log("⚠️ Content too short or blocked:", articleId)
        return
      }

      // Save cleaned content (limit for DB safety)
      await pool.query(
        `UPDATE articles SET content = $1 WHERE id = $2`,
        [content.slice(0, 8000), articleId]
      )

      console.log("✅ Content saved:", articleId)

      // Trigger AI embedding pipeline
      await embeddingQueue.add("embed-article", {
        articleId,
      })

      console.log("🤖 Embedding job queued:", articleId)

    } catch (err) {
      console.error("🚨 Content worker error:", err)
      throw err
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,              // Safe for 8GB RAM
    lockDuration: 120000,
    stalledInterval: 30000,
    maxStalledCount: 3,
  }
)


worker.on("completed", job => {
  console.log("🎯 Content job completed:", job.id)
})

worker.on("failed", (job, err) => {
  console.error("❌ Content job failed:", job?.id, err)
})

worker.on("error", err => {
  console.error("🚨 Content worker fatal error:", err)
})
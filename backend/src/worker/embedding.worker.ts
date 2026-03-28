import { Worker } from "bullmq"
import { redisConnection } from "../queue/redis"
import { db as pool } from '../lib/db'
import { pipeline } from "@xenova/transformers"

console.log("🔥 Embedding worker started")

let embedder: any = null


async function loadModel() {
  if (!embedder) {
    console.log("📦 Loading embedding model...")
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    )
    console.log("✅ Embedding model loaded")
  }
}



const worker = new Worker(
  "embedding-queue",
  async job => {
    const { articleId } = job.data

    console.log("📦 Processing embedding job:", articleId)

    await job.updateProgress(5)

    await loadModel()

    await job.updateProgress(20)

    const { rows } = await pool.query(
      `SELECT title, content FROM articles WHERE id = $1`,
      [articleId]
    )

    if (!rows.length) {
      console.log("⚠️ Article not found:", articleId)
      return
    }

    const title = rows[0].title || ""
    const content = rows[0].content || ""

    if (!content || content.length < 200) {
      console.log("⚠️ Skipping — content too short:", articleId)
      return
    }

    const text = `${title}. ${content}`.slice(0, 2000)

    await job.updateProgress(40)

    /* -------- Embedding -------- */

    let embedding: string | null = null

    try {
      const output = await embedder(text, {
        pooling: "mean",
        normalize: true,
      })

      const embeddingArray = Array.from(output.data)
      embedding = JSON.stringify(embeddingArray)
    } catch (err) {
      console.error("⚠️ Embedding failed:", err)
      return
    }

    await job.updateProgress(80)

    await pool.query(
      `
      UPDATE articles
      SET embedding = $1
      WHERE id = $2
      `,
      [embedding, articleId]
    )

    await job.updateProgress(100)

    console.log("✅ Article embedding saved:", articleId)
  },
  {
    connection: redisConnection,

    /* 🔥 Stability Settings */

    concurrency: 1,
    lockDuration: 300000, // 5 minutes
    stalledInterval: 60000,
    maxStalledCount: 2,
  }
)

worker.on("completed", job => {
  console.log("🎯 Embedding job completed:", job.id)
})

worker.on("failed", (job, err) => {
  console.error("❌ Embedding job failed:", job?.id, err)
})

worker.on("error", err => {
  console.error("🚨 Worker error:", err)
})
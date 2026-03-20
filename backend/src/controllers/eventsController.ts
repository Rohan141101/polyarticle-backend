import { Request, Response } from "express"
import { pool } from "../db"

const DECAY_FACTOR = 0.98

export async function logEvent(req: Request, res: Response) {
  try {
    const user = (req as any).user
    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const userId = user.id

    const { session_id, events } = req.body

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "Invalid events payload" })
    }

    for (const event of events) {
      const { content_id, event_type, dwell_time_ms } = event

      if (!content_id || !event_type) continue

      await pool.query(
        `
        INSERT INTO user_events (user_id, content_id, event_type, created_at, dwell_time_ms)
        VALUES ($1, $2, $3, NOW(), $4)
        `,
        [userId, content_id, event_type, dwell_time_ms || null]
      )

      if (event_type !== "swipe_right" && event_type !== "swipe_left") {
        continue
      }

      const articleResult = await pool.query(
        `SELECT embedding FROM articles WHERE id = $1`,
        [content_id]
      )

      if (!articleResult.rows.length) continue

      const articleEmbedding = articleResult.rows[0].embedding
      if (!articleEmbedding) continue

      const userResult = await pool.query(
        `SELECT user_vector FROM user_profiles WHERE user_id = $1`,
        [userId]
      )

      if (!userResult.rows.length) continue

      let userVector = userResult.rows[0].user_vector

      let baseWeight = event_type === "swipe_right" ? 0.6 : -0.4

      let dwellBoost = 1

      if (dwell_time_ms) {
        if (dwell_time_ms > 8000) dwellBoost = 1.5
        else if (dwell_time_ms > 4000) dwellBoost = 1.2
        else if (dwell_time_ms < 1500) dwellBoost = 0.7
      }

      const weight = baseWeight * dwellBoost

      const updatedVector = userVector.map(
        (val: number, index: number) =>
          val * DECAY_FACTOR + articleEmbedding[index] * weight
      )

      const norm = Math.sqrt(
        updatedVector.reduce((sum: number, val: number) => sum + val * val, 0)
      )

      const normalizedVector =
        norm > 0
          ? updatedVector.map((val: number) => val / norm)
          : updatedVector

      await pool.query(
        `
        UPDATE user_profiles
        SET user_vector = $1,
            updated_at = NOW()
        WHERE user_id = $2
        `,
        [`[${normalizedVector.join(",")}]`, userId]
      )
    }

    return res.json({ success: true })

  } catch (err) {
    console.error("Event logging error:", err)
    return res.status(500).json({ error: "Server error" })
  }
}
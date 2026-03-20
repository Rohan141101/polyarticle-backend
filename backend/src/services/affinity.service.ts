import { pool } from "../db"
import { redis } from "../cache/redis.client"


function computeEventWeight(
  eventType: string,
  dwellTimeMs?: number
): number {
  const dwellSeconds = dwellTimeMs
    ? dwellTimeMs / 1000
    : 0

  const dwellBoost = Math.log(1 + dwellSeconds)

  let baseWeight = 0

  if (eventType === "swipe_right") baseWeight = 1
  if (eventType === "save") baseWeight = 2
  if (eventType === "swipe_left") baseWeight = -0.7
  if (eventType === "open_detail") baseWeight = 1.5

  return baseWeight * dwellBoost
}

/* =======================================================
   🚀 Update Affinity (Called On Swipe)
======================================================= */

export async function updateUserAffinity(
  userId: string,
  category: string,
  eventType: string,
  dwellTimeMs?: number
) {
  const weight = computeEventWeight(eventType, dwellTimeMs)

  if (weight === 0) return

  await pool.query(
    `
    INSERT INTO user_affinity 
      (user_id, category, lifetime_score, recent_score)
    VALUES ($1, $2, $3, $3)
    ON CONFLICT (user_id, category)
    DO UPDATE SET
      lifetime_score = user_affinity.lifetime_score + $3,
      recent_score = user_affinity.recent_score + $3,
      updated_at = NOW()
    `,
    [userId, category, weight]
  )

  // 🔥 Invalidate Redis cache after update
  await redis.del(`affinity:${userId}`)
}

/* =======================================================
   📊 Fetch Precomputed Affinity (Used By Feed)
======================================================= */

export async function getUserAffinity(
  userId: string
): Promise<Record<string, number>> {

  const cacheKey = `affinity:${userId}`

  // 🔥 Try Redis first
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  const result = await pool.query(
    `
    SELECT category, lifetime_score, recent_score
    FROM user_affinity
    WHERE user_id = $1
    `,
    [userId]
  )

  const affinity: Record<string, number> = {}

  for (const row of result.rows) {
    affinity[row.category] =
      row.lifetime_score * 2.5 +
      row.recent_score * 3.5
  }

  // 🔥 Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(affinity), "EX", 300)

  return affinity
}
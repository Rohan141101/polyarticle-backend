import { pool } from '../db'

type Article = {
  id: string
  title: string
  summary: string
  image_url?: string
  url: string
  source: string
  published_at: string
  category?: string
  country?: string
  score?: number
}

type UserProfile = {
  user_vector: number[] | null
  interests: string[]
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5)
}

function applyDiversity(feed: Article[]): Article[] {
  const result: Article[] = []
  const used = new Set<number>()

  while (result.length < feed.length) {
    let added = false

    for (let i = 0; i < feed.length; i++) {
      if (used.has(i)) continue
      const last = result[result.length - 1]
      if (!last || last.category !== feed[i].category) {
        result.push(feed[i])
        used.add(i)
        added = true
        break
      }
    }

    if (!added) {
      for (let i = 0; i < feed.length; i++) {
        if (!used.has(i)) {
          result.push(feed[i])
          used.add(i)
          break
        }
      }
    }
  }

  return result
}

// Batch insert user_seen — single query instead of N queries
async function markArticlesSeen(userId: string, articles: Article[]): Promise<void> {
  if (!articles.length) return

  const values = articles
    .map((_, i) => `($1, $${i + 2})`)
    .join(', ')

  const ids = articles.map(a => a.id)

  await pool.query(
    `INSERT INTO user_seen (user_id, article_id)
     VALUES ${values}
     ON CONFLICT DO NOTHING`,
    [userId, ...ids]
  )
}

// Get user profile in a single query
async function getUserProfile(userId: string): Promise<UserProfile> {
  const result = await pool.query(
    `SELECT user_vector, interests FROM user_profiles WHERE user_id = $1`,
    [userId]
  )
  return {
    user_vector: result.rows[0]?.user_vector ?? null,
    interests: result.rows[0]?.interests ?? [],
  }
}

export async function getNews(
  userId: string,
  page: number = 1,
  limit: number = 10,
  category?: string,
  fresh: boolean = false
): Promise<Article[]> {
  const offset = (page - 1) * limit

  // Category filter — simple sorted query
  if (category && category !== 'For You') {
    const result = await pool.query<Article>(
      `SELECT id, title, summary, image_url, url, source, published_at, category
       FROM articles
       WHERE category = $1
       ORDER BY published_at DESC
       LIMIT $2 OFFSET $3`,
      [category, limit, offset]
    )
    return result.rows
  }

  // Fresh mode — latest unseen articles
  if (fresh) {
    const result = await pool.query<Article>(
      `SELECT id, title, summary, image_url, url, source, published_at, category
       FROM articles
       WHERE id NOT IN (
         SELECT article_id FROM user_seen WHERE user_id = $1
       )
       ORDER BY published_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    await markArticlesSeen(userId, result.rows)
    return result.rows
  }

  // Reset seen articles if running low
  const unseenCountResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM articles a
     WHERE a.embedding IS NOT NULL
     AND a.id NOT IN (
       SELECT article_id FROM user_seen WHERE user_id = $1
     )`,
    [userId]
  )

  const unseenCount = parseInt(unseenCountResult.rows[0].count)

  if (unseenCount < 15) {
    await pool.query(
      `DELETE FROM user_seen
       WHERE user_id = $1
       AND seen_at < NOW() - INTERVAL '2 days'`,
      [userId]
    )
  }

  // Single query for user profile
  const { user_vector, interests } = await getUserProfile(userId)

  // No vector — fall back to interests or recency
  if (!user_vector) {
    if (interests.length > 0) {
      const fallback = await pool.query<Article>(
        `SELECT id, title, summary, image_url, url, published_at, source, category
         FROM articles
         WHERE category = ANY($1)
         ORDER BY published_at DESC
         LIMIT $2 OFFSET $3`,
        [interests, limit, offset]
      )
      return applyDiversity(fallback.rows)
    }

    const fallback = await pool.query<Article>(
      `SELECT id, title, summary, image_url, url, published_at, source, category
       FROM articles
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return applyDiversity(fallback.rows)
  }

  // Format vector safely for pgvector
  const vectorLiteral = `[${user_vector.map(Number).join(',')}]`

  // Personalized ranked feed — unseen first
  let rankedResult = await pool.query<Article>(
    `SELECT
       a.id, a.title, a.summary, a.image_url, a.url,
       a.source, a.published_at, a.category,
       (1 - (a.embedding <=> $2::vector)) +
       (CASE WHEN a.category = ANY($4) THEN 0.2 ELSE 0 END) AS score
     FROM articles a
     WHERE a.embedding IS NOT NULL
       AND a.id NOT IN (
         SELECT article_id FROM user_seen WHERE user_id = $1
       )
     ORDER BY score DESC
     LIMIT 100 OFFSET $3`,
    [userId, vectorLiteral, offset, interests]
  )

  let ranked = rankedResult.rows

  // Fallback — include seen articles if not enough unseen
  if (!ranked.length) {
    rankedResult = await pool.query<Article>(
      `SELECT
         a.id, a.title, a.summary, a.image_url, a.url,
         a.source, a.published_at, a.category,
         (1 - (a.embedding <=> $2::vector)) +
         (CASE WHEN a.category = ANY($4) THEN 0.2 ELSE 0 END) AS score
       FROM articles a
       WHERE a.embedding IS NOT NULL
       ORDER BY score DESC
       LIMIT 100 OFFSET $3`,
      [userId, vectorLiteral, offset, interests]
    )
    ranked = rankedResult.rows
  }

  // Final fallback — pure recency
  if (!ranked.length) {
    const fallback = await pool.query<Article>(
      `SELECT id, title, summary, image_url, url, published_at, source, category
       FROM articles
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return applyDiversity(fallback.rows)
  }

  // Build diverse feed
  const personalizedCount = randomBetween(3, 5)
  const trendingCount = randomBetween(2, 4)
  const explorationCount = randomBetween(1, 3)

  const personalized = ranked.slice(0, personalizedCount)
  const trending = shuffle(ranked.slice(0, 20)).slice(0, trendingCount)
  const explorationStart = randomBetween(10, 30)
  const explorationPool = ranked.slice(explorationStart, explorationStart + 25)
  const exploration = shuffle(explorationPool).slice(0, explorationCount)
  const randomPick = ranked[Math.floor(Math.random() * ranked.length)]

  let finalFeed = shuffle([
    ...personalized,
    ...trending,
    ...exploration,
    randomPick,
  ]).slice(0, limit)

  if (finalFeed.length < limit) {
    finalFeed = ranked.slice(0, limit)
  }

  finalFeed = applyDiversity(finalFeed)

  // Single batch insert instead of N inserts
  await markArticlesSeen(userId, finalFeed)

  return finalFeed
}

export async function getRegionalNews(
  userId: string,
  limit: number = 10
): Promise<Article[]> {
  const userResult = await pool.query<{ location: string }>(
    `SELECT location FROM app_users WHERE id = $1`,
    [userId]
  )

  if (!userResult.rows.length || !userResult.rows[0].location) {
    return []
  }

  const location = userResult.rows[0].location

  const result = await pool.query<Article>(
    `SELECT id, title, summary, image_url, url, source, published_at, category, country
     FROM articles
     WHERE country = $1
     ORDER BY published_at DESC
     LIMIT $2`,
    [location, limit]
  )

  return result.rows
}
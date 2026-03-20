import { pool } from "../db"

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(array: any[]) {
  return [...array].sort(() => Math.random() - 0.5)
}

// ✅ NEW: diversity helper
function applyDiversity(feed: any[]) {
  const result: any[] = []
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

    // fallback if stuck
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

export async function getNews(
  userId: string,
  page: number = 1,
  limit: number = 10,
  category?: string,
  fresh: boolean = false
) {
  const offset = (page - 1) * limit

  if (category && category !== "For You") {
    const result = await pool.query(
      `
      SELECT id, title, summary, image_url, url, source, published_at, category
      FROM articles
      WHERE category = $1
      ORDER BY published_at DESC
      LIMIT $2 OFFSET $3
      `,
      [category, limit, offset]
    )

    return result.rows
  }

  if (fresh) {
    const latestUnseen = await pool.query(
      `
      SELECT id, title, summary, image_url, url, source, published_at, category
      FROM articles
      WHERE id NOT IN (
        SELECT article_id FROM user_seen WHERE user_id = $1
      )
      ORDER BY published_at DESC
      LIMIT $2
      `,
      [userId, limit]
    )

    const rows = latestUnseen.rows

    for (const article of rows) {
      await pool.query(
        `
        INSERT INTO user_seen (user_id, article_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [userId, article.id]
      )
    }

    return rows
  }

  const unseenCountResult = await pool.query(
    `
    SELECT COUNT(*) FROM articles a
    WHERE a.embedding IS NOT NULL
    AND a.id NOT IN (
      SELECT article_id FROM user_seen WHERE user_id = $1
    )
    `,
    [userId]
  )

  const unseenCount = parseInt(unseenCountResult.rows[0].count)

  if (unseenCount < 15) {
    await pool.query(
      `
      DELETE FROM user_seen
      WHERE user_id = $1
      AND seen_at < NOW() - INTERVAL '2 days'
      `,
      [userId]
    )
  }

  const userResult = await pool.query(
    `SELECT user_vector FROM user_profiles WHERE user_id = $1`,
    [userId]
  )

  const interestsResult = await pool.query(
    `SELECT interests FROM user_profiles WHERE user_id = $1`,
    [userId]
  )

  const interests = interestsResult.rows[0]?.interests || []

  if (!userResult.rows.length || !userResult.rows[0].user_vector) {
    if (interests.length > 0) {
      const fallback = await pool.query(
        `
        SELECT id, title, summary, image_url, url, published_at, source, category
        FROM articles
        WHERE category = ANY($1)
        ORDER BY published_at DESC
        LIMIT $2 OFFSET $3
        `,
        [interests, limit, offset]
      )

      return applyDiversity(fallback.rows)
    }

    const fallback = await pool.query(
      `
      SELECT id, title, summary, image_url, url, published_at, source, category
      FROM articles
      ORDER BY published_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    )

    return applyDiversity(fallback.rows)
  }

  const userVector = userResult.rows[0].user_vector

  let rankedResult = await pool.query(
    `
    SELECT
      a.id,
      a.title,
      a.summary,
      a.image_url,
      a.url,
      a.source,
      a.published_at,
      a.category,
      (1 - (a.embedding <=> $2::vector)) +
      (CASE WHEN a.category = ANY($4) THEN 0.2 ELSE 0 END) AS score
    FROM articles a
    WHERE a.embedding IS NOT NULL
      AND a.id NOT IN (
        SELECT article_id
        FROM user_seen
        WHERE user_id = $1
      )
    ORDER BY score DESC
    LIMIT 100 OFFSET $3
    `,
    [userId, `[${userVector.join(",")}]`, offset, interests]
  )

  let ranked = rankedResult.rows

  if (!ranked.length) {
    rankedResult = await pool.query(
      `
      SELECT
        a.id,
        a.title,
        a.summary,
        a.image_url,
        a.url,
        a.source,
        a.published_at,
        a.category,
        (1 - (a.embedding <=> $2::vector)) +
        (CASE WHEN a.category = ANY($4) THEN 0.2 ELSE 0 END) AS score
      FROM articles a
      WHERE a.embedding IS NOT NULL
      ORDER BY score DESC
      LIMIT 100 OFFSET $3
      `,
      [userId, `[${userVector.join(",")}]`, offset, interests]
    )

    ranked = rankedResult.rows
  }

  if (!ranked.length) {
    const fallback = await pool.query(
      `
      SELECT id, title, summary, image_url, url, published_at, source, category
      FROM articles
      ORDER BY published_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    )

    return applyDiversity(fallback.rows)
  }

  const personalizedCount = randomBetween(3, 5)
  const trendingCount = randomBetween(2, 4)
  const explorationCount = randomBetween(1, 3)

  const personalized = ranked.slice(0, personalizedCount)
  const trending = shuffle(ranked.slice(0, 20)).slice(0, trendingCount)

  const explorationStart = randomBetween(10, 30)
  const explorationPool = ranked.slice(explorationStart, explorationStart + 25)
  const exploration = shuffle(explorationPool).slice(0, explorationCount)

  const randomPick =
    ranked[Math.floor(Math.random() * ranked.length)]

  let finalFeed = shuffle([
    ...personalized,
    ...trending,
    ...exploration,
    randomPick
  ]).slice(0, limit)

  if (finalFeed.length < limit) {
    finalFeed = ranked.slice(0, limit)
  }

  // ✅ APPLY DIVERSITY HERE
  finalFeed = applyDiversity(finalFeed)

  for (const article of finalFeed) {
    await pool.query(
      `
      INSERT INTO user_seen (user_id, article_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [userId, article.id]
    )
  }

  return finalFeed
}

export async function getRegionalNews(
  userId: string,
  limit: number = 10
) {
  const userResult = await pool.query(
    `SELECT location FROM app_users WHERE id = $1`,
    [userId]
  )

  if (!userResult.rows.length || !userResult.rows[0].location) {
    return []
  }

  const location = userResult.rows[0].location

  const result = await pool.query(
    `
    SELECT id, title, summary, image_url, url, source, published_at, category, country
    FROM articles
    WHERE country = $1
    ORDER BY published_at DESC
    LIMIT $2
    `,
    [location, limit]
  )

  return result.rows
}
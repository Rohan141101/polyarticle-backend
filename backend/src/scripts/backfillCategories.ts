import { pool } from "../db"

/* =======================================================
   🧠 CATEGORY INFERENCE
======================================================= */

function inferCategory(article: any): string {
  const source = (article.source || "").toLowerCase()
  const title = (article.title || "").toLowerCase()
  const url = (article.url || "").toLowerCase()

  // SOURCE BASED
  if (source.includes("sport") || source.includes("espn")) return "Sports"
  if (source.includes("tech") || source.includes("verge") || source.includes("wired")) return "Technology"
  if (source.includes("business") || source.includes("marketwatch")) return "Business"
  if (source.includes("coin") || source.includes("crypto")) return "Crypto"
  if (source.includes("health")) return "Health"
  if (source.includes("politics")) return "Politics"
  if (source.includes("world")) return "World"

  // URL BASED
  if (url.includes("/sport")) return "Sports"
  if (url.includes("/tech")) return "Technology"
  if (url.includes("/business")) return "Business"
  if (url.includes("/crypto")) return "Crypto"
  if (url.includes("/health")) return "Health"
  if (url.includes("/politics")) return "Politics"
  if (url.includes("/world")) return "World"

  // TITLE KEYWORDS
  if (title.includes("stock") || title.includes("market")) return "Stocks"
  if (title.includes("crypto") || title.includes("bitcoin")) return "Crypto"
  if (title.includes("ai") || title.includes("technology")) return "Technology"
  if (title.includes("sport") || title.includes("match")) return "Sports"
  if (title.includes("health") || title.includes("medical")) return "Health"
  if (title.includes("election") || title.includes("government")) return "Politics"
  if (title.includes("war") || title.includes("global")) return "World"

  return "General"
}

/* =======================================================
   🚀 BACKFILL EXECUTION
======================================================= */

async function backfillCategories() {
  console.log("🔍 Fetching NULL category articles...")

  const result = await pool.query(`
    SELECT id, title, source, url
    FROM articles
    WHERE category IS NULL
  `)

  const articles = result.rows

  console.log(`Found ${articles.length} articles to process`)

  let updated = 0

  for (const article of articles) {
    const category = inferCategory(article)

    await pool.query(
      `
      UPDATE articles
      SET category = $1
      WHERE id = $2
      `,
      [category, article.id]
    )

    updated++
  }

  console.log(`✅ Backfill complete. Updated ${updated} articles.`)
  process.exit(0)
}

backfillCategories().catch(err => {
  console.error("❌ Backfill failed:", err)
  process.exit(1)
})
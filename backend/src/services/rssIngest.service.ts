import Parser from 'rss-parser'
import { httpClient } from '../utils/httpClient'
import { db } from '../lib/db'
import https from 'https'

const parser = new Parser({
  timeout: 15000,
  requestOptions: {
    agent: new https.Agent({ family: 4 }),
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
})

type FeedConfig = {
  url: string
  category: string
  country: string | null
  source?: string
}

const RSS_FEEDS: FeedConfig[] = [
  // ===== GENERAL =====
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'General', country: 'UK' },
  { url: 'https://rss.cnn.com/rss/edition.rss', category: 'General', country: 'USA' },
  { url: 'https://feeds.skynews.com/feeds/rss/home.xml', category: 'General', country: 'UK' },

  { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', category: 'Politics', country: 'UK' },
  { url: 'https://rss.cnn.com/rss/edition_politics.rss', category: 'Politics', country: 'USA' },
  { url: 'https://www.politico.com/rss/politics08.xml', category: 'Politics', country: 'USA' },

  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', category: 'Health', country: 'UK' },
  { url: 'https://rss.cnn.com/rss/edition_health.rss', category: 'Health', country: 'USA' },
  { url: 'https://www.medicalnewstoday.com/rss', category: 'Health', country: null },
  { url: 'https://www.healthline.com/rss', category: 'Health', country: null },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', country: 'UK' },
  { url: 'https://feeds.nbcnews.com/nbcnews/public/news', category: 'World', country: 'USA' },

  { url: 'https://rss.cnn.com/rss/edition_technology.rss', category: 'Technology', country: 'USA' },
  { url: 'https://techcrunch.com/feed/', category: 'Technology', country: null },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Technology', country: null },
  { url: 'https://www.engadget.com/rss.xml', category: 'Technology', country: null },
  { url: 'https://www.wired.com/feed/rss', category: 'Technology', country: null },
  { url: 'https://arstechnica.com/feed/', category: 'Technology', country: null },

  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Business', country: 'USA' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'Business', country: 'USA' },
  { url: 'https://finance.yahoo.com/rss/topstories', category: 'Business', country: 'USA' },

  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', category: 'Stocks', country: 'USA' },
  { url: 'https://cointelegraph.com/rss', category: 'Crypto', country: null },
  { url: 'https://decrypt.co/feed', category: 'Crypto', country: null },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto', country: null },

  { url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', category: 'General', country: 'USA' },
  { url: 'https://feeds.bbci.co.uk/news/uk/rss.xml', category: 'General', country: 'UK' },
  { url: 'https://www.theguardian.com/world/rss', category: 'General', country: 'UK' },
  { url: 'https://www.cbc.ca/cmlink/rss-topstories', category: 'General', country: 'Canada' },
  { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', category: 'General', country: 'Australia' },
]

function cleanUrl(url?: string | null): string | null {
  if (!url) return null
  return url.replace(/&amp;/g, '&')
}

function extractImageFromItem(item: any): string | null {
  if (item.enclosure?.url) return cleanUrl(item.enclosure.url)
  if (item.mediaContent?.$?.url) return cleanUrl(item.mediaContent.$.url)
  if (item.mediaThumbnail?.$?.url) return cleanUrl(item.mediaThumbnail.$.url)

  const html = item.contentEncoded || item.content || item.description
  if (html) {
    const match = html.match(/<img[^>]+src="([^">]+)"/i)
    if (match) return cleanUrl(match[1])
  }

  return null
}

async function extractOGImage(url: string): Promise<string | null> {
  try {
    const res = await httpClient.get(url)
    const match = res.data.match(/<meta property="og:image" content="([^"]+)"/i)
    return match ? cleanUrl(match[1]) : null
  } catch {
    return null
  }
}

type ParsedArticle = {
  title: string
  summary: string
  image: string | null
  url: string
  category: string
  source: string
  publishedAt: Date
  country: string | null
}

async function processFeed(feedConfig: FeedConfig): Promise<ParsedArticle[]> {
  try {
    const res = await httpClient.get(feedConfig.url)
    const feed = await parser.parseString(res.data)

    const articles: ParsedArticle[] = []
    let ogCalls = 0

    for (const item of feed.items) {
      if (!item.title || !item.link || item.title.length < 25) continue

      let image = extractImageFromItem(item)

      if (!image && ogCalls < 80) {
        image = await extractOGImage(item.link)
        ogCalls++
      }

      articles.push({
        title: item.title.trim(),
        summary: (item.contentSnippet || '').slice(0, 500),
        image,
        url: item.link,
        category: feedConfig.category,
        source: feedConfig.source || feed.title || 'RSS',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        country: feedConfig.country,
      })
    }

    return articles
  } catch {
    return []
  }
}

async function batchInsert(articles: ParsedArticle[]) {
  for (const a of articles) {
    try {
      await db.query(
        `
        INSERT INTO articles (title, summary, image_url, url, category, source, published_at, country)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (title, source) DO NOTHING
        `,
        [
          a.title,
          a.summary,
          a.image,
          a.url,
          a.category,
          a.source,
          a.publishedAt.toISOString(),
          a.country,
        ]
      )
    } catch {}
  }

  return { inserted: articles.length, skipped: 0 }
}

async function backfillMissingImages(articles: ParsedArticle[]): Promise<void> {
  const missing = articles.filter(a => !a.image).slice(0, 80)

  await Promise.allSettled(
    missing.map(async (article) => {
      const image = await extractOGImage(article.url)
      if (image) {
        await db.query(
          `
          UPDATE articles
          SET image_url = $1
          WHERE url = $2 AND image_url IS NULL
          `,
          [image, article.url]
        )
      }
    })
  )
}

async function deleteOldArticles(): Promise<number> {
  const res = await db.query(
    `
    DELETE FROM articles
    WHERE published_at < NOW() - INTERVAL '3 days'
    RETURNING *
    `
  )

  return res.rowCount || 0
}

export async function ingestRSSFeeds() {
  const startTime = Date.now()

  const deleted = await deleteOldArticles()

  const allArticles: ParsedArticle[] = []
  const batchSize = 20

  for (let i = 0; i < RSS_FEEDS.length; i += batchSize) {
    const batch = RSS_FEEDS.slice(i, i + batchSize)

    const results = await Promise.allSettled(batch.map(processFeed))

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value)
      }
    }
  }

  const seen = new Set<string>()

  const unique = allArticles.filter(a => {
    if (seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })

  const { inserted, skipped } = await batchInsert(unique)

  await backfillMissingImages(unique.filter(a => !a.image))

  const duration = Math.round((Date.now() - startTime) / 1000)

  return {
    success: true,
    inserted,
    skipped,
    deleted,
    totalFetched: unique.length,
    durationSeconds: duration,
  }
}
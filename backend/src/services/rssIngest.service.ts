import Parser from 'rss-parser'
import axios from 'axios'
import { pool } from '../db'

type FeedConfig = {
  url: string
  category: string
  country: string | null
  source?: string
}

const RSS_FEEDS: FeedConfig[] = [
  // USA — World & Politics
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'World', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', category: 'Politics', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', category: 'Business', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'Technology', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', category: 'Health', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml', category: 'Entertainment', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', category: 'Sports', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', category: 'Technology', country: 'USA' },
  { url: 'https://feeds.washingtonpost.com/rss/world', category: 'World', country: 'USA' },
  { url: 'https://feeds.washingtonpost.com/rss/politics', category: 'Politics', country: 'USA' },
  { url: 'https://feeds.washingtonpost.com/rss/business', category: 'Business', country: 'USA' },
  { url: 'https://feeds.washingtonpost.com/rss/technology', category: 'Technology', country: 'USA' },
  { url: 'https://feeds.washingtonpost.com/rss/sports', category: 'Sports', country: 'USA' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Business', country: 'USA' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Technology', country: 'USA' },
  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', category: 'Stocks', country: 'USA' },
  { url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', category: 'World', country: 'USA' },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', category: 'Stocks', country: 'USA' },
  { url: 'https://www.marketwatch.com/rss/topstories', category: 'Stocks', country: 'USA' },
  { url: 'https://www.marketwatch.com/rss/marketpulse', category: 'Stocks', country: 'USA' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Stocks', country: 'USA' },
  { url: 'https://feeds.bloomberg.com/technology/news.rss', category: 'Technology', country: 'USA' },
  { url: 'https://www.espn.com/espn/rss/news', category: 'Sports', country: 'USA' },
  { url: 'https://api.foxnews.com/v1/content/0/articles?tags=fox-news/world&formatted=true&callback=angular.callbacks._7r', category: 'World', country: 'USA' },
  { url: 'https://moxie.foxnews.com/google-publisher/world.xml', category: 'World', country: 'USA' },
  { url: 'https://moxie.foxnews.com/google-publisher/politics.xml', category: 'Politics', country: 'USA' },
  { url: 'https://moxie.foxnews.com/google-publisher/science-tech.xml', category: 'Technology', country: 'USA' },
  { url: 'https://moxie.foxnews.com/google-publisher/sports.xml', category: 'Sports', country: 'USA' },
  { url: 'https://feeds.npr.org/1001/rss.xml', category: 'World', country: 'USA' },
  { url: 'https://feeds.npr.org/1014/rss.xml', category: 'Politics', country: 'USA' },
  { url: 'https://feeds.npr.org/1015/rss.xml', category: 'Business', country: 'USA' },
  { url: 'https://feeds.npr.org/1048/rss.xml', category: 'Health', country: 'USA' },
  { url: 'https://feeds.npr.org/1045/rss.xml', category: 'Technology', country: 'USA' },
  { url: 'https://feeds.npr.org/1055/rss.xml', category: 'Sports', country: 'USA' },

  // UK
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', country: 'UK' },
  { url: 'http://feeds.bbci.co.uk/news/politics/rss.xml', category: 'Politics', country: 'UK' },
  { url: 'http://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business', country: 'UK' },
  { url: 'http://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology', country: 'UK' },
  { url: 'http://feeds.bbci.co.uk/news/health/rss.xml', category: 'Health', country: 'UK' },
  { url: 'http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Entertainment', country: 'UK' },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports', country: 'UK' },
  { url: 'https://www.theguardian.com/world/rss', category: 'World', country: 'UK' },
  { url: 'https://www.theguardian.com/politics/rss', category: 'Politics', country: 'UK' },
  { url: 'https://www.theguardian.com/business/rss', category: 'Business', country: 'UK' },
  { url: 'https://www.theguardian.com/technology/rss', category: 'Technology', country: 'UK' },
  { url: 'https://www.theguardian.com/sport/rss', category: 'Sports', country: 'UK' },
  { url: 'https://www.theguardian.com/society/health/rss', category: 'Health', country: 'UK' },
  { url: 'https://www.theguardian.com/culture/rss', category: 'Entertainment', country: 'UK' },
  { url: 'https://www.independent.co.uk/rss', category: 'World', country: 'UK' },
  { url: 'https://www.telegraph.co.uk/rss.xml', category: 'World', country: 'UK' },
  { url: 'https://www.ft.com/world?format=rss', category: 'Business', country: 'UK' },

  // Europe
  { url: 'https://www.euronews.com/rss', category: 'World', country: 'Europe' },
  { url: 'https://feeds.feedburner.com/euractiv', category: 'Politics', country: 'Europe' },
  { url: 'https://www.dw.com/rss/rss.xml', category: 'World', country: 'Europe' },
  { url: 'https://www.spiegel.de/international/index.rss', category: 'World', country: 'Europe' },
  { url: 'https://www.lemonde.fr/en/rss/une.xml', category: 'World', country: 'Europe' },
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/english.elpais.com/portada', category: 'World', country: 'Europe' },

  // Australia & New Zealand
  { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', category: 'World', country: 'Australia' },
  { url: 'https://www.abc.net.au/news/feed/51892/rss.xml', category: 'Politics', country: 'Australia' },
  { url: 'https://www.abc.net.au/news/feed/52278/rss.xml', category: 'Business', country: 'Australia' },
  { url: 'https://www.abc.net.au/news/feed/52498/rss.xml', category: 'Technology', country: 'Australia' },
  { url: 'https://www.abc.net.au/news/feed/52498/rss.xml', category: 'Sports', country: 'Australia' },
  { url: 'https://www.smh.com.au/rss/feed.xml', category: 'World', country: 'Australia' },
  { url: 'https://www.rnz.co.nz/rss/news.xml', category: 'World', country: 'New Zealand' },
  { url: 'https://www.stuff.co.nz/rss', category: 'World', country: 'New Zealand' },

  // Canada
  { url: 'https://www.cbc.ca/cmlink/rss-topstories', category: 'World', country: 'Canada' },
  { url: 'https://www.cbc.ca/cmlink/rss-politics', category: 'Politics', country: 'Canada' },
  { url: 'https://www.cbc.ca/cmlink/rss-business', category: 'Business', country: 'Canada' },
  { url: 'https://www.cbc.ca/cmlink/rss-technology', category: 'Technology', country: 'Canada' },
  { url: 'https://www.cbc.ca/cmlink/rss-sports', category: 'Sports', country: 'Canada' },
  { url: 'https://globalnews.ca/feed/', category: 'World', country: 'Canada' },
  { url: 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/', category: 'World', country: 'Canada' },

  // Singapore
  { url: 'https://www.straitstimes.com/news/singapore/rss.xml', category: 'World', country: 'Singapore' },
  { url: 'https://www.straitstimes.com/news/asia/rss.xml', category: 'World', country: 'Singapore' },
  { url: 'https://www.channelnewsasia.com/rss-feeds/8395884', category: 'World', country: 'Singapore' },
  { url: 'https://www.channelnewsasia.com/rss-feeds/8395744', category: 'Business', country: 'Singapore' },
  { url: 'https://www.businesstimes.com.sg/rss/all', category: 'Business', country: 'Singapore' },

  // Global Tech & Crypto
  { url: 'https://techcrunch.com/feed/', category: 'Technology', country: null },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Technology', country: null },
  { url: 'https://www.wired.com/feed/rss', category: 'Technology', country: null },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Technology', country: null },
  { url: 'https://www.technologyreview.com/feed/', category: 'Technology', country: null },
  { url: 'https://venturebeat.com/feed/', category: 'Technology', country: null },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto', country: null },
  { url: 'https://cointelegraph.com/rss', category: 'Crypto', country: null },
  { url: 'https://decrypt.co/feed', category: 'Crypto', country: null },
  { url: 'https://bitcoinmagazine.com/.rss/full/', category: 'Crypto', country: null },

  // Global Health & Science
  { url: 'https://www.who.int/rss-feeds/news-english.xml', category: 'Health', country: null },
  { url: 'https://www.medicalnewstoday.com/rss', category: 'Health', country: null },
  { url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Technology', country: null },
  { url: 'https://www.newscientist.com/feed/home/', category: 'Technology', country: null },

  // Global Entertainment & Sports
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World', country: null },
  { url: 'https://feeds.skynews.com/feeds/rss/world.xml', category: 'World', country: 'UK' },
  { url: 'https://feeds.skynews.com/feeds/rss/politics.xml', category: 'Politics', country: 'UK' },
  { url: 'https://feeds.skynews.com/feeds/rss/technology.xml', category: 'Technology', country: 'UK' },
  { url: 'https://feeds.skynews.com/feeds/rss/business.xml', category: 'Business', country: 'UK' },
  { url: 'https://www.goal.com/feeds/en/news', category: 'Sports', country: null },
  { url: 'https://www.bbc.com/sport/football/rss.xml', category: 'Sports', country: 'UK' },
]

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
})

function cleanUrl(url?: string | null): string | null {
  if (!url) return null
  return url.replace(/&amp;/g, '&')
}

function extractImageFromItem(item: any): string | null {
  if (item.enclosure?.url) return cleanUrl(item.enclosure.url)
  if (item.mediaContent?.url) return cleanUrl(item.mediaContent.url)
  if (item.mediaThumbnail?.url) return cleanUrl(item.mediaThumbnail.url)
  const html = item.contentEncoded || item.content || item.description
  if (html) {
    const match = html.match(/<img[^>]+src="([^">]+)"/i)
    if (match) return cleanUrl(match[1])
  }
  return null
}

async function extractOGImage(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const match = res.data.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
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
    const feed = await parser.parseURL(feedConfig.url)
    const articles: ParsedArticle[] = []

    for (const item of feed.items) {
      if (!item.title || !item.link) continue
      const image = extractImageFromItem(item)
      articles.push({
        title: item.title.trim(),
        summary: (item.contentSnippet || '').slice(0, 1000),
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

async function batchInsert(articles: ParsedArticle[]): Promise<{ inserted: number, skipped: number }> {
  if (!articles.length) return { inserted: 0, skipped: 0 }

  let inserted = 0
  let skipped = 0

  // Insert in chunks of 50
  const chunkSize = 50
  for (let i = 0; i < articles.length; i += chunkSize) {
    const chunk = articles.slice(i, i + chunkSize)

    const values: any[] = []
    const placeholders = chunk.map((_, idx) => {
      const base = idx * 9
      values.push(
        chunk[idx].title,
        chunk[idx].summary,
        chunk[idx].image,
        chunk[idx].url,
        chunk[idx].category,
        chunk[idx].source,
        chunk[idx].publishedAt,
        chunk[idx].country,
      )
      return `(gen_random_uuid(), $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, NOW())`
    })

    try {
      const result = await pool.query(
        `INSERT INTO articles (id, title, summary, image_url, url, category, source, published_at, country, created_at)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT ON CONSTRAINT unique_title_source DO NOTHING`,
        values
      )
      inserted += result.rowCount ?? 0
      skipped += chunk.length - (result.rowCount ?? 0)
    } catch {
      // Fall back to one-by-one on chunk failure
      for (const article of chunk) {
        try {
          const r = await pool.query(
            `INSERT INTO articles (id, title, summary, image_url, url, category, source, published_at, country, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT ON CONSTRAINT unique_title_source DO NOTHING`,
            [article.title, article.summary, article.image, article.url, article.category, article.source, article.publishedAt, article.country]
          )
          if (r.rowCount && r.rowCount > 0) inserted++
          else skipped++
        } catch {
          skipped++
        }
      }
    }
  }

  return { inserted, skipped }
}

async function backfillMissingImages(articles: ParsedArticle[]): Promise<void> {
  const missing = articles.filter(a => !a.image).slice(0, 20)
  await Promise.allSettled(
    missing.map(async (article) => {
      const image = await extractOGImage(article.url)
      if (image) {
        await pool.query(
          `UPDATE articles SET image_url = $1 WHERE url = $2 AND image_url IS NULL`,
          [image, article.url]
        )
      }
    })
  )
}

async function deleteOldArticles(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM articles WHERE published_at < NOW() - INTERVAL '7 days'`
  )
  return result.rowCount ?? 0
}

export async function ingestRSSFeeds() {
  const startTime = Date.now()

  const deleted = await deleteOldArticles()

  const allArticles: ParsedArticle[] = []
  const batchSize = 15

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
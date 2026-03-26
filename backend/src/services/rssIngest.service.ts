import Parser from 'rss-parser'
import axios from 'axios'
import { supabaseAdmin } from '../lib/supabase'

type FeedConfig = {
  url: string
  category: string
  country: string | null
  source?: string
}

const RSS_FEEDS: FeedConfig[] = [
  { url: 'https://rss.cnn.com/rss/edition.rss', category: 'World', country: 'USA' },
  { url: 'https://rss.cnn.com/rss/edition_technology.rss', category: 'Technology', country: 'USA' },
  { url: 'https://feeds.nbcnews.com/nbcnews/public/news', category: 'World', country: 'USA' },
  { url: 'https://feeds.nbcnews.com/nbcnews/public/business', category: 'Business', country: 'USA' },
  { url: 'https://feeds.nbcnews.com/nbcnews/public/technology', category: 'Technology', country: 'USA' },
  { url: 'https://feeds.skynews.com/feeds/rss/world.xml', category: 'World', country: 'UK' },
  { url: 'https://feeds.skynews.com/feeds/rss/business.xml', category: 'Business', country: 'UK' },
  { url: 'https://feeds.skynews.com/feeds/rss/technology.xml', category: 'Technology', country: 'UK' },
  { url: 'https://www.channelnewsasia.com/rss-feeds/8395884', category: 'World', country: 'Singapore' },
  { url: 'https://techcrunch.com/feed/', category: 'Technology', country: null },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Technology', country: null },
  { url: 'https://www.engadget.com/rss.xml', category: 'Technology', country: null },
  { url: 'https://www.wired.com/feed/rss', category: 'Technology', country: null },
  { url: 'https://www.techradar.com/rss', category: 'Technology', country: null },
  { url: 'https://www.zdnet.com/news/rss.xml', category: 'Technology', country: null },
  { url: 'https://arstechnica.com/feed/', category: 'Technology', country: null },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Business', country: 'USA' },
  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', category: 'Stocks', country: 'USA' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'Stocks', country: 'USA' },
  { url: 'https://finance.yahoo.com/rss/topstories', category: 'Business', country: 'USA' },
  { url: 'https://cointelegraph.com/rss', category: 'Crypto', country: null },
  { url: 'https://decrypt.co/feed', category: 'Crypto', country: null },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto', country: null },
  { url: 'https://www.reuters.com/world/rss', category: 'World', country: null },
  { url: 'https://www.reuters.com/technology/rss', category: 'Technology', country: null },
  { url: 'https://www.reuters.com/business/rss', category: 'Business', country: null },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', country: 'UK' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology', country: 'UK' },
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
  if (item.mediaContent?.$?.url) return cleanUrl(item.mediaContent.$.url)
  if (item.mediaThumbnail?.$?.url) return cleanUrl(item.mediaThumbnail.$.url)
  if (item['media:content']?.url) return cleanUrl(item['media:content'].url)

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

async function batchInsert(articles: ParsedArticle[]): Promise<{ inserted: number, skipped: number }> {
  if (!articles.length) return { inserted: 0, skipped: 0 }

  const chunkSize = 50
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < articles.length; i += chunkSize) {
    const chunk = articles.slice(i, i + chunkSize)

    const { data, error } = await supabaseAdmin
      .from('articles')
      .upsert(
        chunk.map(a => ({
          title: a.title,
          summary: a.summary,
          image_url: a.image,
          url: a.url,
          category: a.category,
          source: a.source,
          published_at: a.publishedAt.toISOString(),
          country: a.country,
        })),
        { onConflict: 'title,source' }
      )
      .select()

    if (!error) {
      inserted += data?.length ?? 0
      skipped += chunk.length - (data?.length ?? 0)
    } else {
      skipped += chunk.length
    }
  }

  return { inserted, skipped }
}

async function backfillMissingImages(articles: ParsedArticle[]): Promise<void> {
  const missing = articles.filter(a => !a.image).slice(0, 80)

  await Promise.allSettled(
    missing.map(async (article) => {
      const image = await extractOGImage(article.url)
      if (image) {
        await supabaseAdmin
          .from('articles')
          .update({ image_url: image })
          .eq('url', article.url)
          .is('image_url', null)
      }
    })
  )
}

async function deleteOldArticles(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .delete()
    .lt(
      'published_at',
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    )
    .select()

  if (error) return 0
  return data?.length ?? 0
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
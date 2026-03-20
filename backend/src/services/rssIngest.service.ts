import Parser from 'rss-parser'
import axios from 'axios'
import { pool } from '../db'

const RSS_FEEDS = [
  { url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'World', country: null },
  { url: 'http://feeds.bbci.co.uk/news/politics/rss.xml', category: 'Politics', country: null },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports', country: 'UK' },

  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'World', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', category: 'Politics', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', category: 'Business', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'Technology', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', category: 'Health', country: 'USA' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Movies.xml', category: 'Entertainment', country: 'USA' },

  { url: 'https://www.theguardian.com/world/rss', category: 'World', country: 'UK' },
  { url: 'https://www.theguardian.com/politics/rss', category: 'Politics', country: 'UK' },
  { url: 'https://www.theguardian.com/business/rss', category: 'Business', country: 'UK' },

  { url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', category: 'World', country: null },
  { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', category: 'Stocks', country: 'USA' },

  { url: 'https://www.marketwatch.com/rss/topstories', category: 'Stocks', country: 'USA' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'Business', country: 'USA' },

  { url: 'https://techcrunch.com/feed/', category: 'Technology', country: 'USA' },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Technology', country: 'USA' },
  { url: 'https://www.wired.com/feed/rss', category: 'Technology', country: 'USA' },

  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto', country: null },
  { url: 'https://cointelegraph.com/rss', category: 'Crypto', country: null },

  { url: 'https://www.espn.com/espn/rss/news', category: 'Sports', country: 'USA' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World', country: null }
]

const parser = new Parser({
  timeout: 20000,
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded']
    ]
  }
})

function cleanUrl(url?: string | null) {
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
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const match = res.data.match(
      /<meta\s+property="og:image"\s+content="([^"]+)"/i
    )

    return match ? cleanUrl(match[1]) : null
  } catch {
    return null
  }
}

export async function ingestRSSFeeds() {
  let inserted = 0
  let skipped = 0

  for (const feedConfig of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedConfig.url)

      for (const item of feed.items) {
        if (!item.title || !item.link) continue

        let image = extractImageFromItem(item)

        if (!image) {
          image = await extractOGImage(item.link)
        }

        try {
          const result = await pool.query(
            `
            INSERT INTO articles (
              id,
              title,
              summary,
              image_url,
              url,
              category,
              source,
              published_at,
              country,
              created_at
            )
            VALUES (
              gen_random_uuid(),
              $1,$2,$3,$4,$5,$6,$7,$8,NOW()
            )
            ON CONFLICT ON CONSTRAINT unique_title_source DO NOTHING
            RETURNING id
            `,
            [
              item.title.trim(),
              (item.contentSnippet || '').slice(0, 1000),
              image,
              item.link,
              feedConfig.category,
              feed.title || 'RSS',
              item.pubDate ? new Date(item.pubDate) : new Date(),
              feedConfig.country
            ]
          )

          if (result.rowCount && result.rowCount > 0) {
            inserted++
          } else {
            skipped++
          }

        } catch {
          continue
        }
      }

    } catch {
      continue
    }
  }

  return {
    success: true,
    inserted,
    skipped
  }
}
import { Router, Request, Response } from 'express'
import { getNews, getRegionalNews } from '../services/news.service'
import { ingestRSSFeeds } from '../services/rssIngest.service'
import { repairMissingImages } from '../services/imageRepair.service'
import { requireAuth } from '../middleware/auth.middleware'
import { pool } from '../db'

const router = Router()

router.get('/rss-ingest', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await ingestRSSFeeds()
    return res.json(result)
  } catch (err) {
    console.error('RSS ingest error:', err)
    return res.status(500).json({ error: 'RSS ingestion failed' })
  }
})

router.get('/admin/repair-images', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await repairMissingImages()
    return res.json(result)
  } catch (err) {
    console.error('Image repair failed:', err)
    return res.status(500).json({ error: 'Image repair failed' })
  }
})

router.get('/admin/backfill-categories', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, title, source, url
      FROM articles
      WHERE category IS NULL
    `)

    const articles = result.rows

    function inferCategory(article: any): string {
      const source = (article.source || '').toLowerCase()
      const title = (article.title || '').toLowerCase()
      const url = (article.url || '').toLowerCase()

      if (source.includes('sport') || source.includes('espn')) return 'Sports'
      if (source.includes('tech') || source.includes('verge') || source.includes('wired')) return 'Technology'
      if (source.includes('business') || source.includes('marketwatch')) return 'Business'
      if (source.includes('coin') || source.includes('crypto')) return 'Crypto'
      if (source.includes('health')) return 'Health'
      if (source.includes('politics')) return 'Politics'
      if (source.includes('world')) return 'World'

      if (url.includes('/sport')) return 'Sports'
      if (url.includes('/tech')) return 'Technology'
      if (url.includes('/business')) return 'Business'
      if (url.includes('/crypto')) return 'Crypto'

      if (title.includes('stock') || title.includes('market')) return 'Stocks'
      if (title.includes('bitcoin')) return 'Crypto'
      if (title.includes('ai')) return 'Technology'
      if (title.includes('election') || title.includes('government')) return 'Politics'
      if (title.includes('war') || title.includes('global')) return 'World'

      return 'General'
    }

    let updated = 0

    for (const article of articles) {
      const category = inferCategory(article)

      await pool.query(
        `UPDATE articles SET category = $1 WHERE id = $2`,
        [category, article.id]
      )

      updated++
    }

    return res.json({
      success: true,
      processed: articles.length,
      updated
    })

  } catch (err) {
    console.error('Backfill failed:', err)
    return res.status(500).json({ error: 'Backfill failed' })
  }
})

router.get('/regional', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user

    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    let news = await getRegionalNews(user.id, 10)

    if (!news.length) {
      news = await getNews(user.id, 1, 10, 'World')
    }

    return res.json({
      success: true,
      count: news.length,
      data: news
    })

  } catch (err) {
    console.error('Regional fetch error:', err)
    return res.status(500).json({ error: 'Failed to fetch regional news' })
  }
})

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20)
    const category = req.query.category as string | undefined
    const fresh = req.query.fresh === 'true'

    const user = (req as any).user

    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log(`User ${user.id} fetching ${category || 'For You'} page ${page}`)

    const news = await getNews(
      user.id,
      page,
      limit,
      category,
      fresh
    )

    return res.json({
      success: true,
      page,
      limit,
      category: category || 'For You',
      fresh,
      count: news.length,
      data: news
    })

  } catch (err) {
    console.error('Fetch news error:', err)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
})

router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'news',
    timestamp: new Date().toISOString()
  })
})

export default router
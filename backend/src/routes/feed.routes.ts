import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

/* =======================================================
   🔐 Protect All Feed Routes
======================================================= */

router.use(requireAuth)

/* =======================================================
   📰 Basic Protected Feed Route
======================================================= */

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user

    if (!user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.json({
      success: true,
      message: 'Feed route working',
      userId: user.id
    })

  } catch (error) {
    console.error('Feed route error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})


router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'feed',
    timestamp: new Date().toISOString()
  })
})

export default router
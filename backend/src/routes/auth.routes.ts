import { Router, RequestHandler } from 'express'
import {
  signup,
  login,
  logout,
  me,
  activeSessions,
  revokeOthers,
  revokeSession,
} from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'
import rateLimit from 'express-rate-limit'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()

router.post('/signup', authLimiter, signup)
router.post('/login', authLimiter, login)

router.get('/me', requireAuth as unknown as RequestHandler, me as unknown as RequestHandler)
router.get('/sessions', requireAuth as unknown as RequestHandler, activeSessions as unknown as RequestHandler)
router.post('/logout', requireAuth as unknown as RequestHandler, logout as unknown as RequestHandler)
router.post('/revoke-others', requireAuth as unknown as RequestHandler, revokeOthers as unknown as RequestHandler)
router.post('/revoke-session', requireAuth as unknown as RequestHandler, revokeSession as unknown as RequestHandler)

export default router
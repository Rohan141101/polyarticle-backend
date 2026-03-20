import { Router } from 'express'
import {
  signup,
  login,
  logout,
  me,
  activeSessions,
  revokeOthers,
} from '../controllers/auth.controller'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/logout', logout)

router.get('/me', me)
router.get('/sessions', activeSessions)

router.post('/revoke-others', revokeOthers)

export default router
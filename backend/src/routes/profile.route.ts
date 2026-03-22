import { Router, RequestHandler } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { savePreferences, updateLocation } from '../controllers/profileController'

const router = Router()
const auth = requireAuth as unknown as RequestHandler

router.post('/preferences', auth, savePreferences)
router.patch('/location', auth, updateLocation)

export default router
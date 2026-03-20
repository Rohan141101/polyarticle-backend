import { Router } from "express"
import { logEvent } from "../controllers/eventsController"
import { requireAuth } from "../middleware/auth.middleware"

const router = Router()

// If requireAuth exists, keep it.
// If not, temporarily remove it and just use logEvent.
router.post("/", requireAuth, logEvent)

export default router
import { Router } from "express"
import { requireAuth } from "../middleware/auth.middleware"
import { savePreferences, updateLocation } from "../controllers/profileController"

const router = Router()

router.post("/preferences", requireAuth, savePreferences)
router.patch("/location", requireAuth, updateLocation)

export default router
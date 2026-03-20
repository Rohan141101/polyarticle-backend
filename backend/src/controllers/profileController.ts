import { Request, Response } from "express"
import { pool } from "../db"
import { seedUserVector } from "../services/category.service"

/* =======================================================
   🎯 SAVE CATEGORY PREFERENCES
======================================================= */

export async function savePreferences(req: Request, res: Response) {
  try {
    const user = (req as any).user
    const { categories } = req.body

    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    if (!categories || !Array.isArray(categories) || categories.length < 4) {
      return res.status(400).json({
        error: "Select at least 4 categories"
      })
    }

    const seededVector = seedUserVector(categories)

    // Ensure profile row exists
    await pool.query(
      `
      INSERT INTO user_profiles (user_id, user_vector, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        user_vector = EXCLUDED.user_vector,
        updated_at = NOW()
      `,
      [user.id, `[${seededVector.join(",")}]`]
    )

    return res.json({ success: true })

  } catch (err) {
    console.error("Preference error:", err)
    return res.status(500).json({ error: "Server error" })
  }
}

/* =======================================================
   🌍 UPDATE USER LOCATION
======================================================= */

export async function updateLocation(req: Request, res: Response) {
  try {
    const user = (req as any).user
    const { location } = req.body

    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    if (!location || typeof location !== "string") {
      return res.status(400).json({ error: "Invalid location" })
    }

    // 🔥 IMPORTANT: update app_users (NOT user_profiles)
    await pool.query(
      `
      UPDATE app_users
      SET location = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [location, user.id]
    )

    return res.json({
      success: true,
      location
    })

  } catch (err) {
    console.error("Update location error:", err)
    return res.status(500).json({ error: "Server error" })
  }
}
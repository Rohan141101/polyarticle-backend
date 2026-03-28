import { Request, Response, NextFunction } from 'express'
import { db as pool } from '../lib/db'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
    phone?: string
    location?: string
    is_email_verified: boolean
    is_active: boolean
  }
  sessionToken: string
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const rawHeader = (req.headers.authorization ||
      (req.headers as any).Authorization) as string | undefined

    if (!rawHeader) {
      return res.status(401).json({ error: 'Unauthorized - no header' })
    }

    const token = rawHeader.replace(/Bearer\s+/i, '').trim()

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - no token' })
    }

    const result = await pool.query(
      `
      SELECT 
        s.session_token,
        s.expires_at,
        u.id,
        u.email,
        u.phone,
        u.location,
        u.is_email_verified,
        u.is_active
      FROM sessions s
      JOIN app_users u ON s.user_id = u.id
      WHERE s.session_token = $1
      LIMIT 1
      `,
      [token]
    )

    const session = result.rows[0]

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    if (new Date(session.expires_at) < new Date()) {
      await pool.query(
        `DELETE FROM sessions WHERE session_token = $1`,
        [token]
      )

      return res.status(401).json({ error: 'Session expired' })
    }

    if (!session.is_active) {
      return res.status(403).json({ error: 'Account is inactive' })
    }

    req.user = {
      id: session.id,
      email: session.email,
      phone: session.phone,
      location: session.location,
      is_email_verified: session.is_email_verified,
      is_active: session.is_active
    }

    req.sessionToken = token

    next()
  } catch {
    return res.status(500).json({ error: 'Authentication failed' })
  }
}
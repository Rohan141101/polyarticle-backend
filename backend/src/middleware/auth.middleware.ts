import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'

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
    const header = req.headers.authorization

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = header.replace('Bearer ', '').trim()

    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('*, app_users(*)')
      .eq('session_token', token)
      .single()

    if (error || !session) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('session_token', token)
      return res.status(401).json({ error: 'Session expired' })
    }

    if (!session.app_users?.is_active) {
      return res.status(403).json({ error: 'Account is inactive' })
    }

    req.user = session.app_users
    req.sessionToken = token

    next()
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed' })
  }
}
import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = header.replace('Bearer ', '').trim()

    const { data: session } = await supabase
      .from('sessions')
      .select('*, app_users(*)')
      .eq('session_token', token)
      .single()

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('sessions')
        .delete()
        .eq('session_token', token)

      return res.status(401).json({ error: 'Session expired' })
    }

    ;(req as any).user = session.app_users
    ;(req as any).sessionToken = token

    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(500).json({ error: 'Authentication failed' })
  }
}
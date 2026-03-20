import { Request, Response } from 'express'
import * as AuthService from '../services/auth.service'

type SignupBody = {
  email: string
  password: string
  deviceName?: string
  deviceOS?: string
  location?: string
  interests?: string[]
}

/* ---------- SIGNUP ---------- */
export async function signup(req: Request, res: Response) {
  try {
    const {
      email,
      password,
      deviceName,
      deviceOS,
      location,
      interests,
    } = req.body as SignupBody

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const data = await AuthService.signup(email, password, {
      deviceName,
      deviceOS,
      ipAddress: req.ip,
      location,
      interests,
    })

    res.json(data)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
}

/* ---------- LOGIN ---------- */
export async function login(req: Request, res: Response) {
  try {
    const { email, password, deviceName, deviceOS } = req.body as SignupBody

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const data = await AuthService.login(email, password, {
      deviceName,
      deviceOS,
      ipAddress: req.ip,
    })

    res.json(data)
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
}

/* ---------- ME ---------- */
export async function me(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const user = await AuthService.validateSession(token)

    res.json({ user })
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
}

/* ---------- ACTIVE SESSIONS ---------- */
export async function activeSessions(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const user = await AuthService.validateSession(token)
    const sessions = await AuthService.getActiveSessions(user.id)

    res.json({ sessions })
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
}

/* ---------- LOGOUT ---------- */
export async function logout(req: Request, res: Response) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  await AuthService.logout(token)

  res.json({ success: true })
}

/* ---------- REVOKE OTHER SESSIONS ---------- */
export async function revokeOthers(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const user = await AuthService.validateSession(token)

    await AuthService.revokeOtherSessions(user.id, token)

    res.json({ success: true })
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
}
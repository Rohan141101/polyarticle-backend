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

    console.log("SIGNUP HIT:", email)

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

    console.log("SIGNUP SUCCESS:", email)

    res.json(data)
  } catch (err: any) {
    console.log("SIGNUP ERROR:", err.message)
    res.status(400).json({ error: err.message })
  }
}

/* ---------- LOGIN ---------- */
export async function login(req: Request, res: Response) {
  try {
    const { email, password, deviceName, deviceOS } = req.body as SignupBody

    console.log("LOGIN HIT:", email)

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const data = await AuthService.login(email, password, {
      deviceName,
      deviceOS,
      ipAddress: req.ip,
    })

    console.log("LOGIN SUCCESS:", email)

    res.json(data)
  } catch (err: any) {
    console.log("LOGIN ERROR:", err.message)
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
    console.log("ME ERROR:", err.message)
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
    console.log("SESSIONS ERROR:", err.message)
    res.status(401).json({ error: err.message })
  }
}

/* ---------- LOGOUT ---------- */
export async function logout(req: Request, res: Response) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  await AuthService.logout(token)

  console.log("LOGOUT SUCCESS")

  res.json({ success: true })
}

/* ---------- REVOKE OTHER SESSIONS ---------- */
export async function revokeOthers(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const user = await AuthService.validateSession(token)

    await AuthService.revokeOtherSessions(user.id, token)

    console.log("REVOKE OTHERS SUCCESS")

    res.json({ success: true })
  } catch (err: any) {
    console.log("REVOKE ERROR:", err.message)
    res.status(401).json({ error: err.message })
  }
}
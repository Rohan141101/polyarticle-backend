import { supabase } from '../lib/supabase'
import { hashPassword, verifyPassword } from '../utils/hash'
import { generateSessionToken } from '../utils/token'

type DeviceInfo = {
  deviceName?: string
  deviceOS?: string
  ipAddress?: string
  location?: string
  interests?: string[] // ✅ ADD THIS
}

/* ---------- SIGNUP ---------- */
export async function signup(
  email: string,
  password: string,
  device?: DeviceInfo
) {
  const { data: existing } = await supabase
    .from('app_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    throw new Error('User already exists')
  }

  const passwordHash = await hashPassword(password)

  const { data: user, error } = await supabase
    .from('app_users')
    .insert([
      {
        email,
        password_hash: passwordHash,
        location: device?.location ?? null,
        is_active: true,
        is_email_verified: false,
      },
    ])
    .select()
    .single()

  if (error || !user) {
    throw new Error('Signup failed')
  }

  /* ---------- 🔥 CREATE USER PROFILE (IMPORTANT) ---------- */
  await supabase.from('user_profiles').insert([
    {
      user_id: user.id,
      interests: device?.interests ?? [],
      created_at: new Date(),
      updated_at: new Date(),
    },
  ])

  const sessionToken = generateSessionToken()

  await supabase.from('sessions').insert([
    {
      user_id: user.id,
      session_token: sessionToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      device_name: device?.deviceName ?? null,
      device_os: device?.deviceOS ?? null,
      ip_address: device?.ipAddress ?? null,
    },
  ])

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      location: user.location,
    },
    sessionToken,
  }
}

/* ---------- LOGIN ---------- */
export async function login(
  email: string,
  password: string,
  device?: DeviceInfo
) {
  const { data: user } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (!user) throw new Error('Invalid credentials')

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) throw new Error('Invalid credentials')

  const sessionToken = generateSessionToken()

  await supabase.from('sessions').insert([
    {
      user_id: user.id,
      session_token: sessionToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      device_name: device?.deviceName ?? null,
      device_os: device?.deviceOS ?? null,
      ip_address: device?.ipAddress ?? null,
    },
  ])

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      location: user.location,
    },
    sessionToken,
  }
}

/* ---------- VALIDATE SESSION ---------- */
export async function validateSession(token: string) {
  const { data: session } = await supabase
    .from('sessions')
    .select('*, app_users(*)')
    .eq('session_token', token)
    .single()

  if (!session) throw new Error('Invalid session')

  if (new Date(session.expires_at) < new Date()) {
    await supabase
      .from('sessions')
      .delete()
      .eq('session_token', token)

    throw new Error('Session expired')
  }

  return session.app_users
}

/* ---------- GET ACTIVE SESSIONS ---------- */
export async function getActiveSessions(userId: string) {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data
}

/* ---------- LOGOUT (SINGLE) ---------- */
export async function logout(sessionToken: string) {
  await supabase
    .from('sessions')
    .delete()
    .eq('session_token', sessionToken)
}

/* ---------- REVOKE OTHER SESSIONS ---------- */
export async function revokeOtherSessions(
  userId: string,
  currentToken: string
) {
  await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .neq('session_token', currentToken)
}
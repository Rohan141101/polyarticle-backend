import { supabaseAdmin } from '../lib/supabase'
import { hashPassword, verifyPassword } from '../utils/hash'
import { generateSessionToken } from '../utils/token'

type DeviceInfo = {
  deviceName?: string
  deviceOS?: string
  ipAddress?: string
  location?: string
  interests?: string[]
}

type UserRecord = {
  id: string
  email: string
  phone?: string
  location?: string
  is_active: boolean
  is_email_verified: boolean
  password_hash: string
}

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function signup(
  email: string,
  password: string,
  device?: DeviceInfo
) {
  const { data: existing } = await supabaseAdmin
    .from('app_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) throw new Error('User already exists')

  const passwordHash = await hashPassword(password)

  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .insert([{
      email,
      password_hash: passwordHash,
      location: device?.location ?? null,
      is_active: true,
      is_email_verified: false,
    }])
    .select()
    .single()

  // ✅ FIX: expose real error
  if (error || !user) {
    console.error("❌ SUPABASE USER INSERT ERROR:", error)
    throw new Error(error?.message || 'User insert failed')
  }

  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert([{
      user_id: user.id,
      interests: device?.interests ?? [],
      created_at: new Date(),
      updated_at: new Date(),
    }])

  // ✅ FIX: don’t silently ignore profile failure
  if (profileError) {
    console.error("❌ PROFILE INSERT ERROR:", profileError)
    throw new Error(profileError.message)
  }

  const sessionToken = generateSessionToken()

  const { error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert([{
      user_id: user.id,
      session_token: sessionToken,
      expires_at: new Date(Date.now() + SESSION_EXPIRY_MS),
      device_name: device?.deviceName ?? null,
      device_os: device?.deviceOS ?? null,
      ip_address: device?.ipAddress ?? null,
    }])

  if (sessionError) {
    console.error("❌ SESSION INSERT ERROR:", sessionError)
    throw new Error(sessionError.message || 'Session creation failed')
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone ?? null,
      location: user.location ?? null,
    },
    sessionToken,
  }
}

export async function login(
  email: string,
  password: string,
  device?: DeviceInfo
) {
  const { data: user } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single<UserRecord>()

  if (!user) throw new Error('Invalid credentials')

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) throw new Error('Invalid credentials')

  const sessionToken = generateSessionToken()

  const { error: sessionError } = await supabaseAdmin
    .from('sessions')
    .insert([{
      user_id: user.id,
      session_token: sessionToken,
      expires_at: new Date(Date.now() + SESSION_EXPIRY_MS),
      device_name: device?.deviceName ?? null,
      device_os: device?.deviceOS ?? null,
      ip_address: device?.ipAddress ?? null,
    }])

  if (sessionError) {
    console.error("❌ SESSION INSERT ERROR:", sessionError)
    throw new Error(sessionError.message || 'Login failed — could not create session')
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone ?? null,
      location: user.location ?? null,
    },
    sessionToken,
  }
}

export async function validateSession(token: string) {
  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('*, app_users(*)')
    .eq('session_token', token)
    .single()

  if (!session) throw new Error('Invalid session')

  if (new Date(session.expires_at) < new Date()) {
    await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('session_token', token)
    throw new Error('Session expired')
  }

  return session.app_users
}

export async function getActiveSessions(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('id, device_name, device_os, ip_address, created_at, expires_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message || 'Failed to fetch sessions')

  return data
}

export async function logout(sessionToken: string) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('session_token', sessionToken)

  if (error) throw new Error(error.message || 'Logout failed')
}

export async function revokeOtherSessions(
  userId: string,
  currentToken: string
) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .neq('session_token', currentToken)

  if (error) throw new Error(error.message || 'Failed to revoke sessions')
}

export async function revokeSessionById(userId: string, sessionId: string) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message || 'Failed to revoke session')
}
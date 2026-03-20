import { createContext, useContext, useEffect, useState } from 'react'
import { getSession, saveSession, clearSession } from '../lib/session'
import { getMe, logout as apiLogout } from '../lib/api'
import { eventLogger } from '../utils/eventLogger'

type AuthContextType = {
  session: string | null
  user: any
  loading: boolean
  loginSuccess: (token: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const stored = await getSession()

      if (!stored) {
        setLoading(false)
        return
      }

      try {
        const data = await getMe(stored)

        setSession(stored)
        setUser(data.user)

        eventLogger.setToken(stored)
      } catch {
        await clearSession()
      }

      setLoading(false)
    })()
  }, [])

  const loginSuccess = async (token: string) => {
    await saveSession(token)

    try {
      const data = await getMe(token)

      setSession(token)
      setUser(data.user)

      eventLogger.setToken(token)
    } catch {
      await clearSession()
    }
  }

  const logout = async () => {
    if (session) {
      try {
        await apiLogout(session)
      } catch {}
    }

    await clearSession()
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        loginSuccess,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
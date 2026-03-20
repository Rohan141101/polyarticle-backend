import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getActiveSessions,
  logout,
  revokeOtherSessions,
} from '../lib/api'
import { useSettings } from '../context/SettingsContext'

type Props = {
  onBack: () => void
}

type SessionType = {
  session_token: string
  device_name?: string
  device_os?: string
  ip_address?: string
  created_at: string
}

export default function ActiveSessions({ onBack }: Props) {
  const { session } = useAuth()
  const { settings } = useSettings()
  const isDark = settings.darkMode

  const [sessions, setSessions] = useState<SessionType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      if (!session) return
      const data = await getActiveSessions(session)
      setSessions(data.sessions || [])
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        Alert.alert('Session expired')
      }
    } finally {
      setLoading(false)
    }
  }

  const revokeSession = async (token: string) => {
    try {
      await logout(token)
      fetchSessions()
    } catch {
      Alert.alert('Failed to revoke session')
    }
  }

  const revokeAllOthers = async () => {
    try {
      if (!session) return
      await revokeOtherSessions(session)
      fetchSessions()
    } catch {
      Alert.alert('Failed to revoke sessions')
    }
  }

  const bg = isDark ? '#000' : '#fff'
  const card = isDark ? '#121212' : '#f5f5f7'
  const text = isDark ? '#fff' : '#000'
  const sub = isDark ? '#aaa' : '#666'

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.back, { color: text }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: text }]}>
          Active Sessions
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={text} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity
            style={styles.revokeAllBtn}
            onPress={revokeAllOthers}
          >
            <Text style={styles.revokeAllText}>
              Revoke All Other Sessions
            </Text>
          </TouchableOpacity>

          {sessions.map((s, index) => {
            const isCurrent = s.session_token === session

            return (
              <View
                key={index}
                style={[styles.card, { backgroundColor: card }]}
              >
                <Text style={[styles.device, { color: text }]}>
                  {s.device_name || 'Unknown device'}
                </Text>

                {isCurrent && (
                  <Text style={styles.current}>
                    This device
                  </Text>
                )}

                <Text style={[styles.sub, { color: sub }]}>
                  {s.device_os || 'Unknown OS'}
                </Text>

                <Text style={[styles.sub, { color: sub }]}>
                  IP: {s.ip_address || 'N/A'}
                </Text>

                <Text style={[styles.sub, { color: sub }]}>
                  Logged in: {new Date(s.created_at).toLocaleString()}
                </Text>

                {!isCurrent && (
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    onPress={() => revokeSession(s.session_token)}
                  >
                    <Text style={styles.revokeText}>
                      Revoke
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },

  back: { fontSize: 16 },

  title: {
    fontSize: 18,
    fontWeight: '700',
  },

  content: { padding: 18 },

  card: {
    padding: 18,
    borderRadius: 16,
    marginTop: 18,
  },

  device: {
    fontSize: 16,
    fontWeight: '700',
  },

  sub: {
    fontSize: 13,
    marginTop: 4,
  },

  current: {
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },

  revokeBtn: {
    marginTop: 14,
    backgroundColor: '#d00',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  revokeText: {
    color: '#fff',
    fontWeight: '600',
  },

  revokeAllBtn: {
    backgroundColor: '#ff9800',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  revokeAllText: {
    color: '#fff',
    fontWeight: '600',
  },
})
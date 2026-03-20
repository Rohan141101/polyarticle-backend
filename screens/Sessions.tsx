import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSessions, revokeSession } from '../lib/api'

type Session = {
  id: string
  device_name: string | null
  device_os: string | null
  ip_address: string | null
  created_at: string
}

export default function Sessions({ onBack }: { onBack: () => void }) {
  const { session } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    ;(async () => {
      const data = await getSessions(session)
      setSessions(data)
      setLoading(false)
    })()
  }, [session])

  const handleRevoke = async (id: string) => {
    if (!session) return
    await revokeSession(session, id)
    setSessions(sessions.filter(s => s.id !== id))
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Active Sessions</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.device}>
              {item.device_name || 'Unknown device'}
            </Text>
            <Text style={styles.meta}>
              {item.device_os || 'Unknown OS'}
            </Text>
            <Text style={styles.meta}>
              IP: {item.ip_address || '—'}
            </Text>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => handleRevoke(item.id)}
            >
              <Text style={styles.logoutText}>Logout device</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', marginTop: 40 }}>
              No active sessions
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

  back: {
    fontWeight: '600',
    marginBottom: 6,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
  },

  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  device: {
    fontSize: 16,
    fontWeight: '700',
  },

  meta: {
    color: '#666',
    marginTop: 2,
  },

  logoutBtn: {
    marginTop: 10,
  },

  logoutText: {
    color: '#000',
    fontWeight: '600',
  },
})
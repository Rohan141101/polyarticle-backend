import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import * as Device from 'expo-device'
import { login } from '../lib/api'
import { useAuth } from '../context/AuthContext'

type Props = {
  onSignup: () => void
  onForgot: () => void
  onLoginSuccess: () => void
}

export default function Login({
  onSignup,
  onForgot,
  onLoginSuccess,
}: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { loginSuccess } = useAuth()

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password')
      return
    }

    try {
      setLoading(true)

      const data = await login({
        email,
        password,
        deviceName: Device.modelName ?? 'Unknown device',
        deviceOS: Device.osName ?? 'Unknown OS',
      })

      await loginSuccess(data.sessionToken)
      onLoginSuccess()
    } catch (err: any) {
      alert(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* 🔼 Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Welcome back,</Text>
          <Text style={styles.subtitle}>Sign in to PolyArticle</Text>

          <TextInput
            placeholder="Email"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Password"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Logging in…' : 'Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onForgot}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* 🔽 Bottom Footer */}
        <View style={styles.bottomFooter}>
          <Text style={styles.footerText}>
            Don’t have an account?
          </Text>
          <TouchableOpacity onPress={onSignup}>
            <Text style={styles.link}> Sign up</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    color: '#777',
    marginBottom: 24,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  button: {
    backgroundColor: '#000',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  link: {
    color: '#000',
    fontWeight: '600',
  },

  footerText: {
    fontSize: 14,
    color: '#444',
  },

  bottomFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
})
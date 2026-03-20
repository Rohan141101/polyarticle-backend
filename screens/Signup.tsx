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
import { Picker } from '@react-native-picker/picker'
import { signup } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Ionicons } from '@expo/vector-icons'

type Props = {
  onLogin: () => void
  onSignupSuccess: () => void
}

const LOCATIONS = [
  "USA","United Kingdom","Australia","New Zealand","Germany",
  "France","Switzerland","Netherlands","Spain","Luxembourg"
]

const CATEGORIES = [
  "World 🌍","Sports ⚽","Technology 💻","Business 💼",
  "Crypto 🪙","Politics 🏛️","Entertainment 🎬","Health 🧠"
]

export default function Signup({ onLogin, onSignupSuccess }: Props) {
  const [step, setStep] = useState(1)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [location, setLocation] = useState('USA')
  const [loading, setLoading] = useState(false)

  const { loginSuccess } = useAuth()

  const toggleInterest = (item: string) => {
    setSelectedInterests((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    )
  }

  const validateStep1 = () => {
    if (!email || !password || !confirmPassword) {
      alert('Please fill all required fields')
      return false
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return false
    }

    return true
  }

  const handleNextStep1 = () => {
    if (!validateStep1()) return
    setStep(2)
  }

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      alert('Please fill all required fields')
      return
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    try {
      setLoading(true)

      const data = await signup({
        email,
        password,
        location,
        interests: selectedInterests.map(i => i.split(' ')[0]),
        deviceName: Device.modelName ?? 'Unknown device',
        deviceOS: Device.osName ?? 'Unknown OS',
      })

      await loginSuccess(data.sessionToken)
      onSignupSuccess()
    } catch (err: any) {
      alert(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <Text style={styles.step}>Step {step} of 3</Text>

        {step === 1 && (
          <>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join PolyArticle</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                placeholder="Enter password"
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#777"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Repeat Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                placeholder="Repeat password"
                style={styles.passwordInput}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#777"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleNextStep1}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Pick topics you care about</Text>

            <View style={styles.interestsWrap}>
              {CATEGORIES.map((item) => {
                const active = selectedInterests.includes(item)
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => toggleInterest(item)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep(3)}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>Select your region</Text>

            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={location}
                onValueChange={(itemValue) => setLocation(itemValue)}
              >
                {LOCATIONS.map((loc) => (
                  <Picker.Item key={loc} label={loc} value={loc} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating account…' : 'Finish'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.footer}>
          <Text>Already have an account?</Text>
          <TouchableOpacity onPress={onLogin}>
            <Text style={styles.link}> Login</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  step: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#888',
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: '#777',
    marginBottom: 24,
  },

  label: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
    marginTop: 6,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  passwordInput: {
    flex: 1,
    height: 50,
  },

  interestsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
  },

  pillActive: {
    backgroundColor: '#000',
  },

  pillText: {
    fontSize: 13,
  },

  pillTextActive: {
    color: '#fff',
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginBottom: 20,
  },

  button: {
    backgroundColor: '#000',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
})
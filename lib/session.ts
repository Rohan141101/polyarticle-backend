import * as SecureStore from 'expo-secure-store'

const SESSION_KEY = 'flashfeed_session'


export async function saveSession(token: string) {
  try {
    if (!token) return

    await SecureStore.setItemAsync(SESSION_KEY, token)
    console.log('✅ Session saved')
  } catch (err) {
    console.log('❌ Failed to save session:', err)
  }
}


export async function getSession() {
  try {
    const token = await SecureStore.getItemAsync(SESSION_KEY)

    if (!token) {
      console.log('⚠️ No session found')
      return null
    }

    const cleaned = token.trim()

    console.log('🔑 Session retrieved:', cleaned)

    return cleaned
  } catch (err) {
    console.log('❌ Failed to get session:', err)
    return null
  }
}


export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY)
    console.log('🧹 Session cleared')
  } catch (err) {
    console.log('❌ Failed to clear session:', err)
  }
}
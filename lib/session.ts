import * as SecureStore from 'expo-secure-store'

const SESSION_KEY = 'flashfeed_session'

export async function saveSession(token: string) {
  await SecureStore.setItemAsync(SESSION_KEY, token)
}

export async function getSession() {
  const token = await SecureStore.getItemAsync(SESSION_KEY)
  return token?.trim() ?? null
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}
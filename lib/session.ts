import * as SecureStore from 'expo-secure-store'

const SESSION_KEY = 'flashfeed_session'

export async function saveSession(token: string) {
  await SecureStore.setItemAsync(SESSION_KEY, token)
}

export async function getSession() {
  return SecureStore.getItemAsync(SESSION_KEY)
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}
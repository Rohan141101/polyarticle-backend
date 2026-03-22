import { getSession } from './session'

const API_URL = "https://polyarticle-backend.onrender.com"

type AuthPayload = {
  email: string
  password: string
  location?: string
  interests?: string[]
  deviceName?: string
  deviceOS?: string
}

async function handleJson(res: Response) {
  const text = await res.text()

  if (!text) {
    throw new Error('Empty response from server')
  }

  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON from server')
  }

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (!res.ok) {
    throw new Error(data?.error || 'Request failed')
  }

  return data
}

export async function signup(payload: AuthPayload) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return handleJson(res)
}

/* 🔥 UPDATED LOGIN WITH DEBUG */
export async function login(payload: AuthPayload) {
  try {
    console.log("CALLING LOGIN API")

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    console.log("STATUS:", res.status)

    const text = await res.text()
    console.log("RAW RESPONSE:", text)

    if (!text) throw new Error('Empty response')

    const data = JSON.parse(text)
    console.log("PARSED DATA:", data)

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED')
    }

    if (!res.ok) {
      throw new Error(data?.error || 'Request failed')
    }

    return data

  } catch (e) {
    console.log("FETCH ERROR:", e)
    throw e
  }
}

export async function getMe(token?: string) {
  const authToken = token || (await getSession())

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  return handleJson(res)
}

export async function updateLocation(location: string) {
  const token = await getSession()

  const res = await fetch(`${API_URL}/profile/location`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ location }),
  })

  return handleJson(res)
}

export async function getActiveSessions(token?: string) {
  const authToken = token || (await getSession())

  const res = await fetch(`${API_URL}/auth/sessions`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  return handleJson(res)
}

export async function logout(sessionToken?: string) {
  const token = sessionToken || (await getSession())

  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return handleJson(res)
}

export async function revokeOtherSessions(token?: string) {
  const authToken = token || (await getSession())

  const res = await fetch(`${API_URL}/auth/revoke-others`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  return handleJson(res)
}

export async function fetchNews(
  category?: string,
  page: number = 1,
  limit: number = 10,
  fresh: boolean = false
) {
  const token = await getSession()

  const selectedCategory = category || 'For You'

  const url = `${API_URL}/news?category=${encodeURIComponent(
    selectedCategory
  )}&page=${page}&limit=${limit}&fresh=${fresh}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const response = await handleJson(res)

  const articlesArray = response?.data || []

  return articlesArray.map((article: any) => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    image: article.image_url
      ? article.image_url.replace(/&amp;/g, '&')
      : undefined,
    url: article.url,
    source: article.source || '',
    publishedAt: article.published_at || undefined,
    category: article.category || undefined,
  }))
}

export async function fetchRegionalNews(limit: number = 10) {
  const token = await getSession()

  const res = await fetch(`${API_URL}/news/regional?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const response = await handleJson(res)

  const articlesArray = response?.data || []

  return articlesArray.map((article: any) => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    image: article.image_url
      ? article.image_url.replace(/&amp;/g, '&')
      : undefined,
    url: article.url,
    source: article.source || '',
    publishedAt: article.published_at || undefined,
    category: article.category || undefined,
    country: article.country || undefined,
  }))
}
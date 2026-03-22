import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import SwipeDeck from '../components/SwipeDeck'
import { useSettings } from '../context/SettingsContext'
import { useEffect, useState, useRef, useCallback } from 'react'
import { fetchNews, fetchRegionalNews } from '../lib/api'
import { eventLogger } from '../utils/eventLogger'
import mobileAds, {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads'

const INTERSTITIAL_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : (process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || TestIds.INTERSTITIAL)

const BANNER_ID = __DEV__
  ? TestIds.BANNER
  : (process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TestIds.BANNER)

const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID)

const CATEGORIES = [
  'For You',
  'Regional',
  'World',
  'Politics',
  'Business',
  'Stocks',
  'Crypto',
  'Sports',
  'Entertainment',
  'Technology',
  'Health',
  'General',
]

type Article = {
  id: string
  title: string
  summary: string
  image?: string
  url?: string
  source?: string
  publishedAt?: string
  category?: string
  country?: string
}

type AdItem = {
  id: string
  type: 'ad'
  title: string
  summary: string
  image?: string
  url?: string
  sponsor?: string
}

type FeedItem = (Article & { type: 'article' }) | AdItem

function insertAds(articles: Article[]): FeedItem[] {
  const result: FeedItem[] = []
  let count = 0
  let nextAd = 3
  for (const article of articles) {
    result.push({ ...article, type: 'article' })
    count++
    if (count === nextAd) {
      result.push({
        id: `ad-${count}`,
        type: 'ad',
        title: 'Sponsored',
        summary: '',
      })
      nextAd += 5
    }
  }
  return result
}

type Props = {
  onProfilePress: () => void
  onOpenArticle: (article: Article) => void
}

export default function Feed({ onProfilePress, onOpenArticle }: Props) {
  const { settings } = useSettings()
  const [activeCategory, setActiveCategory] = useState('For You')
  const [articles, setArticles] = useState<FeedItem[]>([])
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const swipeCountRef = useRef(0)
  const lastAdTimeRef = useRef(0)
  const interstitialLoaded = useRef(false)
  const dwellStartRef = useRef<number | null>(null)
  const loadingMoreRef = useRef(false)

  const isDark = settings.darkMode
  const bg = isDark ? '#000' : '#f7f7f7'
  const text = isDark ? '#fff' : '#000'
  const avatarBg = isDark ? '#333' : '#eaeaea'
  const pillActiveBg = isDark ? '#fff' : '#000'
  const pillActiveText = isDark ? '#000' : '#fff'
  const pillInactiveBg = isDark ? '#222' : '#eaeaea'
  const pillInactiveText = isDark ? '#aaa' : '#555'

  useEffect(() => {
    mobileAds().initialize()
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded.current = true
    })
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoaded.current = false
      interstitial.load()
    })
    interstitial.load()
    return () => {
      unsubscribeLoaded()
      unsubscribeClosed()
    }
  }, [])

  const maybeShowInterstitial = () => {
    const now = Date.now()
    if (
      swipeCountRef.current > 10 &&
      swipeCountRef.current % 6 === 0 &&
      now - lastAdTimeRef.current > 90000 &&
      interstitialLoaded.current
    ) {
      interstitial.show()
      lastAdTimeRef.current = now
    }
  }

  const loadInitial = useCallback(async () => {
    try {
      setInitialLoading(true)
      setError(null)
      setPage(1)
      setCurrentIndex(0)
      let response
      if (activeCategory === 'Regional') {
        response = await fetchRegionalNews(20)
      } else {
        response = await fetchNews(activeCategory, 1, 20)
      }
      const fetched = Array.isArray(response) ? response : []
      setArticles(insertAds(fetched))
    } catch {
      setError('Failed to load articles. Pull down to retry.')
    } finally {
      setInitialLoading(false)
    }
  }, [activeCategory])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      setCurrentIndex(0)
      let response
      if (activeCategory === 'Regional') {
        response = await fetchRegionalNews(20)
      } else {
        response = await fetchNews(activeCategory, 1, 20, true)
      }
      const fetched = Array.isArray(response) ? response : []
      setArticles(insertAds(fetched))
      setPage(1)
    } catch {
      setError('Failed to refresh. Try again.')
    } finally {
      setRefreshing(false)
    }
  }, [activeCategory])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || activeCategory === 'Regional') return
    try {
      loadingMoreRef.current = true
      setLoadingMore(true)
      const nextPage = page + 1
      const response = await fetchNews(activeCategory, nextPage, 20)
      const fetched = Array.isArray(response) ? response : []
      if (fetched.length > 0) {
        setArticles((prev) => [...prev, ...insertAds(fetched)])
        setPage(nextPage)
      }
    } catch {
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [activeCategory, page])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    if (articles.length > 0 && currentIndex >= articles.length - 5) {
      loadMore()
    }
  }, [currentIndex, articles.length, loadMore])

  useEffect(() => {
    const current = articles[currentIndex]
    if (current) {
      dwellStartRef.current = Date.now()
      if (current.type !== 'ad') {
        eventLogger.log({
          content_id: current.id,
          event_type: 'impression',
          position: currentIndex,
        })
      }
    }
  }, [currentIndex])

  const handleSwipe = (type: 'swipe_left' | 'swipe_right', article: FeedItem) => {
    swipeCountRef.current++
    maybeShowInterstitial()
    const dwellTime = dwellStartRef.current ? Date.now() - dwellStartRef.current : null
    if (article.type !== 'ad') {
      eventLogger.log({
        content_id: article.id,
        event_type: type,
        dwell_time_ms: dwellTime,
      })
    }
  }

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <ActivityIndicator style={{ marginTop: 100 }} color={text} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.topBar}>
            <Text style={[styles.logo, { color: text }]}>PolyArticle</Text>
            <TouchableOpacity onPress={onProfilePress}>
              <View style={[styles.avatar, { backgroundColor: avatarBg }]} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.pill,
                  { backgroundColor: cat === activeCategory ? pillActiveBg : pillInactiveBg },
                ]}
              >
                <Text style={{ color: cat === activeCategory ? pillActiveText : pillInactiveText }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
            </View>
          ) : (
            <View style={styles.swipeContainer}>
              {articles.length > 0 && (
                <SwipeDeck
                  key={activeCategory}
                  data={articles as any}
                  currentIndex={currentIndex}
                  onIndexChange={setCurrentIndex}
                  onLike={(a: any) => handleSwipe('swipe_right', a)}
                  onDislike={(a: any) => handleSwipe('swipe_left', a)}
                  onSave={(a: any) => {
                    if (a?.type !== 'ad') {
                      eventLogger.log({ content_id: a.id, event_type: 'save' })
                    }
                  }}
                  onOpenDetail={(a: any) => {
                    if (a?.type === 'ad') return
                    onOpenArticle(a)
                  }}
                />
              )}
              {loadingMore && (
                <ActivityIndicator style={{ marginTop: 10 }} color={text} />
              )}
            </View>
          )}
        </ScrollView>

        <View style={[styles.stickyBanner, { backgroundColor: isDark ? '#111' : '#fff' }]}>
          <BannerAd unitId={BANNER_ID} size={BannerAdSize.BANNER} />
        </View>
      </View>
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
  logo: { fontSize: 22, fontWeight: 'bold' },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    margin: 8,
  },
  swipeContainer: {
    flex: 1,
    minHeight: 600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  stickyBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 6,
    elevation: 10,
  },
})
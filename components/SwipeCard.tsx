import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { useRef, useEffect, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useSettings } from '../context/SettingsContext'
import {
  NativeAd,
  NativeAdView,
  TestIds,
} from 'react-native-google-mobile-ads'

const { width, height } = Dimensions.get('window')

type SwipeStrength = 'soft' | 'hard'

type Item = {
  id: string
  category?: string
  title: string
  summary: string
  image?: string
  url?: string
  source?: string
  publishedAt?: string
  type?: 'article' | 'ad'
}

type Props = {
  item: Item
  onLike?: (strength: SwipeStrength) => void
  onDislike?: (strength: SwipeStrength) => void
  onSave?: () => void
  onOpenDetail?: () => void
  disabled?: boolean
}

const NATIVE_AD_ID = __DEV__
  ? TestIds.NATIVE
  : (process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID || TestIds.NATIVE)

export default function SwipeCard({
  item,
  onLike,
  onDislike,
  onSave,
  onOpenDetail,
  disabled,
}: Props) {
  const { settings } = useSettings()
  const pan = useRef(new Animated.ValueXY()).current
  const threshold = width * 0.35

  const [nativeAd, setNativeAd] = useState<any>(null)

  const isAd = item.type === 'ad'

  const fallbackImage =
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c'

  useEffect(() => {
    if (!disabled) {
      pan.setValue({ x: 0, y: 0 })
    }
  }, [item.id, disabled])

  useEffect(() => {
    if (!isAd) return
    NativeAd.createForAdRequest(NATIVE_AD_ID)
      .then(setNativeAd)
      .catch(() => {})
  }, [item.id])

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-15deg', '0deg', '15deg'],
  })

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const dislikeOpacity = pan.x.interpolate({
    inputRange: [-threshold, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const triggerHaptic = (strength: SwipeStrength) => {
    if (!settings.haptics) return
    Haptics.impactAsync(
      strength === 'hard'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Light
    )
  }

  const exit = (
    direction: 'right' | 'left' | 'up',
    strength: SwipeStrength = 'hard'
  ) => {
    let toValue

    if (direction === 'right') {
      toValue = { x: width * 1.4, y: 120 }
    } else if (direction === 'left') {
      toValue = { x: -width * 1.4, y: 120 }
    } else {
      toValue = { x: 0, y: -height }
    }

    triggerHaptic(strength)

    Animated.timing(pan, {
      toValue,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      if (direction === 'right') onLike?.(strength)
      if (direction === 'left') onDislike?.(strength)
      if (direction === 'up') onSave?.()
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        const { dx, vx } = gesture

        if (dx > threshold || vx > 1.1) {
          exit('right')
        } else if (dx < -threshold || vx < -1.1) {
          exit('left')
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  function formatTime(dateString?: string) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate },
          ],
        },
      ]}
      {...(!disabled ? panResponder.panHandlers : {})}
    >
      {isAd && <Text style={styles.sponsoredLabel}>Sponsored</Text>}

      <Animated.View style={[styles.overlay, { opacity: likeOpacity, right: 30 }]}>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>

      <Animated.View style={[styles.overlay, { opacity: dislikeOpacity, left: 30 }]}>
        <Text style={styles.dislikeText}>NOPE</Text>
      </Animated.View>

      {isAd ? (
        nativeAd ? (
          <View style={styles.adContainer}>
            <NativeAdView nativeAd={nativeAd} style={{ flex: 1 }}>
              <Text style={styles.adHeadline}>{nativeAd.headline}</Text>
              <Text style={styles.adDescription}>{nativeAd.body}</Text>
              <View style={styles.adCTA}>
                <Text style={styles.adCTAText}>{nativeAd.callToAction}</Text>
              </View>
            </NativeAdView>
          </View>
        ) : (
          <View style={styles.adContainer}>
            <ActivityIndicator />
          </View>
        )
      ) : (
        <>
          <View style={styles.contentWrap}>
            <Image
              source={{ uri: item.image || fallbackImage }}
              style={styles.image}
            />

            <View style={styles.textBlock}>
              <Text style={styles.category}>
                {item.category?.toUpperCase()}
              </Text>

              <Text style={styles.title}>{item.title}</Text>

              {(item.source || item.publishedAt) && (
                <Text style={styles.meta}>
                  {item.source ?? ''} {item.source && item.publishedAt ? '•' : ''}{' '}
                  {formatTime(item.publishedAt)}
                </Text>
              )}

              <Text style={styles.summary} numberOfLines={3}>
                {item.summary}
              </Text>
            </View>
          </View>

          <View style={styles.readMoreWrapper}>
            <TouchableOpacity activeOpacity={0.7} onPress={onOpenDetail}>
              <Text style={styles.readMore}>...Read More</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.buttonBar} pointerEvents={disabled ? 'none' : 'auto'}>
        <Circle onPress={() => exit('left')}>
          <Ionicons name="close" size={26} color="#000" />
        </Circle>

        <Circle onPress={() => exit('up')}>
          <Ionicons name="bookmark-outline" size={24} color="#000" />
        </Circle>

        <Circle onPress={() => exit('right')}>
          <Ionicons name="checkmark" size={32} color="#000" />
        </Circle>
      </View>
    </Animated.View>
  )
}

function Circle({
  children,
  onPress,
}: {
  children: React.ReactNode
  onPress?: () => void
}) {
  return (
    <TouchableOpacity style={styles.circle} onPress={onPress}>
      {children}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '92%',
    borderRadius: 28,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  sponsoredLabel: {
    position: 'absolute',
    top: 14,
    left: 14,
    fontSize: 11,
    fontWeight: '700',
    color: '#777',
    zIndex: 30,
  },
  overlay: { position: 'absolute', top: 60, zIndex: 20 },
  likeText: { fontSize: 28, fontWeight: '900', color: '#22c55e' },
  dislikeText: { fontSize: 28, fontWeight: '900', color: '#ef4444' },
  contentWrap: { flex: 1 },
  image: { width: '100%', height: '55%' },
  textBlock: { padding: 20 },
  category: { fontSize: 12, fontWeight: '700', color: '#777' },
  meta: { fontSize: 12, color: '#999', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  summary: { fontSize: 15, color: '#555' },
  readMoreWrapper: { alignItems: 'flex-end', paddingHorizontal: 20 },
  readMore: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
  buttonBar: { flexDirection: 'row', justifyContent: 'center', gap: 30, marginBottom: -15 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adContainer: { flex: 1, padding: 16 },
  adHeadline: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  adDescription: { fontSize: 14, color: '#666', marginBottom: 12 },
  adCTA: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  adCTAText: { color: '#fff', fontWeight: '700' },
})
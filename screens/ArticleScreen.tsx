import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

type Article = {
  id: string
  title: string
  summary: string
  image?: string
  category: string
  source?: string
  url?: string
}

type Props = {
  article: Article
  onBack: () => void
}

export default function ArticleScreen({ article, onBack }: Props) {
  const openOriginal = () => {
    if (article.url) {
      Linking.openURL(article.url)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={26} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image
          source={{
            uri:
              article.image ??
              'https://images.unsplash.com/photo-1635647317468-c4dbcdb6195c',
          }}
          style={styles.image}
        />

        <View style={styles.content}>
          <Text style={styles.category}>
            {article.category?.toUpperCase()}
          </Text>

          <Text style={styles.title}>{article.title}</Text>

          <Text style={styles.summary}>{article.summary}</Text>

          <TouchableOpacity
            style={styles.readButton}
            onPress={openOriginal}
          >
            <Text style={styles.readButtonText}>
              Read Full Article
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  image: {
    width: '100%',
    height: 260,
  },

  content: {
    padding: 20,
  },

  category: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777',
    marginBottom: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },

  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 20,
  },

  readButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  readButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
})
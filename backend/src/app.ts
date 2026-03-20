import express from 'express'
import authRoutes from './routes/auth.routes'
import feedRoutes from './routes/feed.routes'
import newsRoutes from './routes/news.routes'
import eventsRoutes from './routes/events.routes'
import profileRoutes from './routes/profile.route'

const app = express()

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/feed', feedRoutes)
app.use('/news', newsRoutes)
app.use('/events', eventsRoutes)
app.use('/profile', profileRoutes)

export default app
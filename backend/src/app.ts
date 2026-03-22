import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth.routes'
import feedRoutes from './routes/feed.routes'
import newsRoutes from './routes/news.routes'
import eventsRoutes from './routes/events.routes'
import profileRoutes from './routes/profile.route'

const app = express()

// Security headers
app.use(helmet())

// CORS
app.use(cors({
  origin: '*', // tighten this after launch
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10kb' })) // prevent large payload attacks

// Routes
app.use('/auth', authRoutes)
app.use('/feed', feedRoutes)
app.use('/news', newsRoutes)
app.use('/events', eventsRoutes)
app.use('/profile', profileRoutes)


app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
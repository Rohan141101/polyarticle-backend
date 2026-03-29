import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth.routes'
import feedRoutes from './routes/feed.routes'
import newsRoutes from './routes/news.routes'
import eventsRoutes from './routes/events.routes'
import profileRoutes from './routes/profile.route'
import deleteAccountRoutes from './routes/deleteAccount.route'

const app = express()

app.set('trust proxy', 1)

app.use(helmet())

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10kb' }))

app.use('/auth', authRoutes)
app.use('/auth', deleteAccountRoutes)
app.use('/feed', feedRoutes)
app.use('/news', newsRoutes)
app.use('/events', eventsRoutes)
app.use('/profile', profileRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: 'Internal server error' })
})

export default app
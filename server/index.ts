import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
import authRoutes from './routes/auth.js'
import classroomRoutes from './routes/classrooms.js'
import assignmentRoutes from './routes/assignments.js'
import submissionRoutes from './routes/submissions.js'
import analyticsRoutes from './routes/analytics.js'
import messageRoutes from './routes/messages.js'
import exportRoutes from './routes/export.js'
import gradeBoundaryRoutes from './routes/gradeBoundary.js'
import gradeTrackerRoutes from './routes/gradeTracker.js'
import termRoutes from './routes/terms.js'
import externalGradeRoutes from './routes/externalGrades.js'
import unitRoutes from './routes/units.js'
import understandingLevelRoutes from './routes/understandingLevels.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Trust Railway/Heroku reverse proxy so rate limiters see the real client IP
app.set('trust proxy', 1)

// Security headers (CSP disabled — React SPA with inline scripts)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))

// CORS — only allow known origins; null origin allows Electron (file://) and server-to-server
const allowedOrigins = [
  'https://edutrack-production-2a6d.up.railway.app',
  'http://localhost:5173',
  'http://localhost:4000',
]
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true)
    else callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// Body size limit — prevents payload-based DoS
app.use(express.json({ limit: '1mb' }))

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again in 5 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/register', registerLimiter)
app.use('/api', apiLimiter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'EduTrack API is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/classrooms', classroomRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/grade-boundaries', gradeBoundaryRoutes)
app.use('/api/grade-tracker', gradeTrackerRoutes)
app.use('/api/terms', termRoutes)
app.use('/api/external-grades', externalGradeRoutes)
app.use('/api/units', unitRoutes)
app.use('/api/understanding-levels', understandingLevelRoutes)
app.use('/api/admin', adminRoutes)

// In production, serve the built frontend from the same server
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')))
  app.get('*path', (_req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'))
  })
}

// Clean JSON error for oversized payloads instead of HTML stack trace
app.use((err: any, _req: any, res: any, next: any) => {
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request too large (max 1MB)' })
    return
  }
  next(err)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app

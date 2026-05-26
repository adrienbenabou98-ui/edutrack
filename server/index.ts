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
import notificationRoutes from './routes/notifications.js'
import gradeGoalRoutes from './routes/gradeGoals.js'
import rubricRoutes from './routes/rubrics.js'
import templateRoutes from './routes/templates.js'
import lessonPlanRoutes from './routes/lessonPlans.js'
import studentRoutes from './routes/students.js'
import announcementRoutes from './routes/announcements.js'
import googleRoutes from './routes/google.routes.js'
import { createCalendarEvent } from './services/google.service.js'

import { PrismaClient } from '@prisma/client'
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
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again in 1 minute' },
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
app.use('/api/notifications', notificationRoutes)
app.use('/api/grade-goals', gradeGoalRoutes)
app.use('/api/rubrics', rubricRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/lesson-plans', lessonPlanRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/google', googleRoutes)

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
  startReminderScheduler()
})

export default app

const prismaScheduler = new PrismaClient()

function startReminderScheduler() {
  // Runs once on startup, then every 24 hours
  runDailyReminders()
  setInterval(runDailyReminders, 24 * 60 * 60 * 1000)
}

async function runDailyReminders() {
  try {
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Find assignments due within the next 48 hours that are published
    const upcoming = await prismaScheduler.assignment.findMany({
      where: {
        status: 'PUBLISHED',
        dueDate: { gte: now, lte: in48h },
      },
      include: {
        classroom: {
          include: { enrollments: { select: { studentId: true } } },
        },
      },
    })

    for (const assignment of upcoming) {
      for (const { studentId } of assignment.classroom.enrollments) {
        const already = await prismaScheduler.notification.findFirst({
          where: {
            userId: studentId,
            type: 'ASSIGNMENT_REMINDER',
            title: { contains: assignment.id },
          },
        })
        if (already) continue
        await prismaScheduler.notification.create({
          data: {
            userId: studentId,
            type: 'ASSIGNMENT_REMINDER',
            title: assignment.id,
            message: `Reminder: "${assignment.title}" is due ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'soon'}.`,
          },
        })

        // Silent Google Calendar sync alongside the in-app notification
        prismaScheduler.user.findUnique({
          where: { id: studentId },
          select: { googleCalendarLinked: true, googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
        }).then(student => {
          if (student?.googleCalendarLinked && student.googleAccessToken && student.googleRefreshToken && assignment.dueDate) {
            createCalendarEvent(
              studentId,
              student.googleAccessToken,
              student.googleRefreshToken,
              student.googleTokenExpiry,
              { title: `${assignment.title} — due soon`, dueDate: new Date(assignment.dueDate) },
            ).catch(() => {})
          }
        }).catch(() => {})
      }
    }
  } catch {
    // Scheduler errors must not crash the server
  }
}

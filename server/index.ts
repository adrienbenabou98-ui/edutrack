import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { loginLimiter, registerLimiter, apiLimiter } from './middleware/rateLimiter.js'
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

if (process.env.NODE_ENV === 'production') {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ANTHROPIC_API_KEY',
    'CORS_ORIGIN',
    'FRONTEND_URL',
  ]
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error('Missing required production env vars:', missing)
    process.exit(1)
  }
  console.log('Production environment validated ✓')
}

const app = express()
const PORT = process.env.PORT || 4000

// Trust Railway/Heroku reverse proxy so rate limiters see the real client IP
app.set('trust proxy', 1)

// Security headers (CSP disabled — React SPA with inline scripts)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))

// CORS — origins from CORS_ORIGIN env var (comma-separated); null origin allows Electron (file://) and server-to-server
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4000']
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true)
    else callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Body size limit — prevents payload-based DoS
app.use(express.json({ limit: '1mb' }))

app.use('/api/auth/login', loginLimiter)
app.use('/api/auth/register', registerLimiter)
app.use('/api', apiLimiter)

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  })
})

// Public build-version endpoint used by the frontend to detect new deployments
// and prompt active users to refresh. Exposes ONLY the version string — no env
// vars, no secrets, no user data — so it is safe to call unauthenticated.
const APP_VERSION = process.env.RAILWAY_GIT_COMMIT_SHA
  ?? process.env.npm_package_version
  ?? 'dev'
app.get('/api/version', (_req, res) => {
  res.json({ version: APP_VERSION })
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
            message: { contains: assignment.id },
          },
        })
        if (already) continue
        await prismaScheduler.notification.create({
          data: {
            userId: studentId,
            type: 'ASSIGNMENT_REMINDER',
            title: `Due soon: ${assignment.title}`,
            message: `[${assignment.id}] "${assignment.title}" is due ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'soon'}.`,
            link: `/student/assignment/${assignment.id}`,
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

    // Notify teachers about assignments that went past their due date with
    // missing submissions. Only look at the last 24h so each is flagged once.
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const justOverdue = await prismaScheduler.assignment.findMany({
      where: {
        status: 'PUBLISHED',
        dueDate: { gte: dayAgo, lt: now },
      },
      include: {
        classroom: {
          select: { teacherId: true, enrollments: { select: { studentId: true } } },
        },
        submissions: { select: { studentId: true } },
      },
    })

    for (const assignment of justOverdue) {
      const submittedIds = new Set(assignment.submissions.map(s => s.studentId))
      const missingCount = assignment.classroom.enrollments
        .filter(e => !submittedIds.has(e.studentId)).length
      if (missingCount === 0) continue

      const already = await prismaScheduler.notification.findFirst({
        where: {
          userId: assignment.classroom.teacherId,
          type: 'LATE_SUBMISSIONS',
          title: assignment.id,
        },
      })
      if (already) continue

      await prismaScheduler.notification.create({
        data: {
          userId: assignment.classroom.teacherId,
          type: 'LATE_SUBMISSIONS',
          title: assignment.id,
          message: `"${assignment.title}" is past due with ${missingCount} missing submission${missingCount === 1 ? '' : 's'}.`,
        },
      })
    }
  } catch {
    // Scheduler errors must not crash the server
  }
}

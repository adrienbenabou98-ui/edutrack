import express from 'express'
import cors from 'cors'
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

app.use(cors())
app.use(express.json())

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app

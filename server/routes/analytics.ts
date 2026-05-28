import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { studentProgress, classroomAnalytics, classInsight } from '../controllers/analytics.controller.js'

const router = Router()

router.use(authenticate)
router.get('/student', requireRole('STUDENT'), studentProgress)
router.get('/student/:studentId', requireRole('TEACHER'), studentProgress)
router.get('/classroom/:classroomId', requireRole('TEACHER'), classroomAnalytics)
router.get('/classroom/:classroomId/insight', requireRole('TEACHER'), classInsight)

export default router

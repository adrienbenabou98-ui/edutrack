import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getClassroomGradeTracker, getStudentGradeDetail, saveComment, curveSubmissions, resetCurve } from '../controllers/gradeTracker.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/classroom/:classroomId', getClassroomGradeTracker)
router.get('/student/:studentId', getStudentGradeDetail)
router.put('/student/:studentId/comment', saveComment)
router.post('/curve', curveSubmissions)
router.post('/reset-curve', resetCurve)

export default router

import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { exportClassroomCSV, exportStudentReport, exportStudentPDF } from '../controllers/export.controller.js'

const router = Router()

router.use(authenticate, requireRole('TEACHER'))
router.get('/classroom/:classroomId/csv', exportClassroomCSV)
router.get('/student/:studentId/csv', exportStudentReport)
router.post('/student/:studentId/pdf', exportStudentPDF)

export default router

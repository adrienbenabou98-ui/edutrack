import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  getExternalGrades, createExternalAssignment, updateExternalAssignment,
  deleteExternalAssignment, setExternalGrade, curveExternalAssignment,
} from '../controllers/externalGrades.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/classroom/:classroomId', getExternalGrades)
router.post('/classroom/:classroomId/assignments', createExternalAssignment)
router.put('/assignments/:id', updateExternalAssignment)
router.delete('/assignments/:id', deleteExternalAssignment)
router.put('/assignments/:assignmentId/grades/:studentId', setExternalGrade)
router.post('/assignments/:id/curve', curveExternalAssignment)

export default router

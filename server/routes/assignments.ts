import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  createAssignment, getAssignment, updateAssignment,
  getClassroomAssignments, getStudentAssignments, getAllTeacherAssignments,
} from '../controllers/assignment.controller.js'

const router = Router()

router.use(authenticate)
router.get('/my', requireRole('STUDENT'), getStudentAssignments)
router.get('/all', requireRole('TEACHER'), getAllTeacherAssignments)
router.get('/classroom/:classroomId', getClassroomAssignments)
router.post('/', requireRole('TEACHER'), createAssignment)
router.get('/:id', getAssignment)
router.patch('/:id', requireRole('TEACHER'), updateAssignment)

export default router

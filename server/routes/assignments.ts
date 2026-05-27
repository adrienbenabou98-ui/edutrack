import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  createAssignment, getAssignment, updateAssignment,
  getClassroomAssignments, getStudentAssignments, getAllTeacherAssignments,
} from '../controllers/assignment.controller.js'
import { validate } from '../middleware/validate.js'
import { createAssignmentSchema, updateAssignmentSchema } from '../schemas/assignment.schema.js'

const router = Router()

router.use(authenticate)
router.get('/my', requireRole('STUDENT'), getStudentAssignments)
router.get('/all', requireRole('TEACHER'), getAllTeacherAssignments)
router.get('/classroom/:classroomId', getClassroomAssignments)
router.post('/', requireRole('TEACHER'), validate(createAssignmentSchema), createAssignment)
router.get('/:id', getAssignment)
router.patch('/:id', requireRole('TEACHER'), validate(updateAssignmentSchema), updateAssignment)

export default router

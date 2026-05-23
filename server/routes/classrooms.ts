import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  createClassroom, updateClassroom, getMyClassrooms, getClassroom, joinClassroom,
  createStudent, updateStudent, removeStudent,
} from '../controllers/classroom.controller.js'

const router = Router()

router.use(authenticate)
router.get('/', getMyClassrooms)
router.post('/', requireRole('TEACHER'), createClassroom)
router.get('/:id', getClassroom)
router.patch('/:id', requireRole('TEACHER'), updateClassroom)
router.post('/join', requireRole('STUDENT'), joinClassroom)
router.post('/:id/students', requireRole('TEACHER'), createStudent)
router.put('/:id/students/:studentId', requireRole('TEACHER'), updateStudent)
router.delete('/:id/students/:studentId', requireRole('TEACHER'), removeStudent)

export default router

import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  getUnits, createUnit, updateUnit, deleteUnit,
  addLesson, updateLesson, deleteLesson,
  setLessonUnderstanding, setUnitAssessment,
} from '../controllers/units.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/classroom/:classroomId', getUnits)
router.post('/classroom/:classroomId', createUnit)
router.put('/:id', updateUnit)
router.delete('/:id', deleteUnit)
router.post('/:unitId/lessons', addLesson)
router.put('/lessons/:lessonId', updateLesson)
router.delete('/lessons/:lessonId', deleteLesson)
router.put('/lessons/:lessonId/understanding/:studentId', setLessonUnderstanding)
router.put('/:unitId/assessment/:studentId', setUnitAssessment)

export default router

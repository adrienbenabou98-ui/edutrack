import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getLessonPlans, upsertLessonPlan, deleteLessonPlan } from '../controllers/lessonplan.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/', getLessonPlans)
router.post('/', upsertLessonPlan)
router.delete('/:id', deleteLessonPlan)
export default router

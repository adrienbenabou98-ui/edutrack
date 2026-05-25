import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getMyGradeGoals, upsertGradeGoal } from '../controllers/gradeGoal.controller.js'

const router = Router()
router.use(authenticate, requireRole('STUDENT'))
router.get('/', getMyGradeGoals)
router.put('/:classroomId', upsertGradeGoal)

export default router

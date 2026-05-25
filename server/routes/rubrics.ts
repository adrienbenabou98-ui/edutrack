import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getRubrics, createRubric, updateRubric, deleteRubric } from '../controllers/rubric.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/', getRubrics)
router.post('/', createRubric)
router.put('/:id', updateRubric)
router.delete('/:id', deleteRubric)

export default router

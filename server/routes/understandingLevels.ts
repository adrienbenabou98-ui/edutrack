import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getLevels, createLevel, updateLevel, deleteLevel, reorderLevels } from '../controllers/understandingLevels.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/', getLevels)
router.post('/', createLevel)
router.put('/reorder', reorderLevels)
router.put('/:id', updateLevel)
router.delete('/:id', deleteLevel)

export default router

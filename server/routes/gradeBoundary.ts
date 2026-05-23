import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getBoundaries, saveBoundaries } from '../controllers/gradeBoundary.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/', getBoundaries)
router.put('/', saveBoundaries)

export default router

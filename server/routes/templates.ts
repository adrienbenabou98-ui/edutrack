import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { listTemplates, createTemplate, updateTemplate, deleteTemplate, useTemplate } from '../controllers/template.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/', listTemplates)
router.post('/', createTemplate)
router.put('/:id', updateTemplate)
router.delete('/:id', deleteTemplate)
router.post('/:id/use', useTemplate)
export default router

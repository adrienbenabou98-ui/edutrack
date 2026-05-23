import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { listTerms, getActiveTerm, createTerm, updateTerm, deleteTerm, setActiveTerm } from '../controllers/terms.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))
router.get('/', listTerms)
router.get('/active', getActiveTerm)
router.post('/', createTerm)
router.put('/:id', updateTerm)
router.delete('/:id', deleteTerm)
router.post('/:id/set-active', setActiveTerm)

export default router

import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../controllers/announcements.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))

router.get('/', getAnnouncements)
router.post('/', createAnnouncement)
router.delete('/:id', deleteAnnouncement)

export default router

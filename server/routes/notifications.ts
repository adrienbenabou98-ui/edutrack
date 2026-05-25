import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getNotifications, markRead, markAllRead, deleteNotification } from '../controllers/notification.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', getNotifications)
router.put('/read-all', markAllRead)
router.put('/:id/read', markRead)
router.delete('/:id', deleteNotification)

export default router

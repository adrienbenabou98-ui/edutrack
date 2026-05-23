import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { sendMessage, getMyMessages, getClassroomMessages, markRead, getUnreadCount } from '../controllers/message.controller.js'

const router = Router()

router.use(authenticate)
router.get('/', getMyMessages)
router.get('/unread-count', getUnreadCount)
router.get('/classroom/:classroomId', getClassroomMessages)
router.post('/', sendMessage)
router.patch('/mark-read', markRead)

export default router

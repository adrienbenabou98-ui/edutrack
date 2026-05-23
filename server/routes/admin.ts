import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { listUsers, createUser, updateUser, deleteUser, resetPassword, toggleSuspend } from '../controllers/admin.controller.js'

const router = Router()

router.use(authenticate, requireRole('ADMIN'))

router.get('/users', listUsers)
router.post('/users', createUser)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)
router.post('/users/:id/reset-password', resetPassword)
router.post('/users/:id/suspend', toggleSuspend)

export default router

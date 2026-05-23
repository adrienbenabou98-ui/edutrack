import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { submitAssignment, getSubmission, getAssignmentSubmissions, getMySubmissions } from '../controllers/submission.controller.js'

const router = Router()

router.use(authenticate)
router.get('/my', requireRole('STUDENT'), getMySubmissions)
router.get('/assignment/:assignmentId', requireRole('TEACHER'), getAssignmentSubmissions)
router.post('/', requireRole('STUDENT'), submitAssignment)
router.get('/:id', getSubmission)

export default router

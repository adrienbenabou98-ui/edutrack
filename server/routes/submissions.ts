import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { submitAssignment, getSubmission, getAssignmentSubmissions, getMySubmissions, dismissPlagiarism } from '../controllers/submission.controller.js'

const router = Router()

router.use(authenticate)
router.get('/my', requireRole('STUDENT'), getMySubmissions)
router.get('/assignment/:assignmentId', requireRole('TEACHER'), getAssignmentSubmissions)
router.post('/', requireRole('STUDENT'), submitAssignment)
router.put('/:id/dismiss-plagiarism', requireRole('TEACHER', 'ADMIN'), dismissPlagiarism)
router.get('/:id', getSubmission)

export default router

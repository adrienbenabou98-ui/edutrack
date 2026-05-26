import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import {
  getParentContacts, addParentContact, deleteParentContact,
  getStudentTimeline,
  getClassroomEngagement, getAtRiskStudents,
  getInterventions, getAllInterventions, upsertIntervention, deleteIntervention,
} from '../controllers/students.controller.js'

const router = Router()
router.use(authenticate, requireRole('TEACHER'))

router.get('/:studentId/contacts', getParentContacts)
router.post('/:studentId/contacts', addParentContact)
router.delete('/:studentId/contacts/:contactId', deleteParentContact)
router.get('/:studentId/timeline', getStudentTimeline)

router.get('/classrooms/:classroomId/engagement', getClassroomEngagement)
router.get('/classrooms/:classroomId/at-risk', getAtRiskStudents)
router.get('/classrooms/:classroomId/interventions', getInterventions)
router.put('/:studentId/interventions/:classroomId', upsertIntervention)
router.delete('/:studentId/interventions/:classroomId', deleteIntervention)
router.get('/interventions/all', getAllInterventions)

export default router

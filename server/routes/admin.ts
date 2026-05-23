import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { listUsers, createUser, updateUser, deleteUser, resetPassword, toggleSuspend } from '../controllers/admin.controller.js'
import { listClassrooms, getClassroomStudents, toggleArchive, deleteClassroom, removeStudent } from '../controllers/adminClassrooms.controller.js'
import { listAssignments, getSubmissions, overrideGrade, deleteAssignment, deleteSubmission } from '../controllers/adminContent.controller.js'
import { getPlatformStats, getUsageStats } from '../controllers/adminAnalytics.controller.js'
import { getSettings, updateSettings, listAnnouncements, createAnnouncement, toggleAnnouncement, deleteAnnouncement, getActiveAnnouncements } from '../controllers/adminPlatform.controller.js'
import { getAuditLog, getUserLoginHistory, forceLogout, getAuditActions } from '../controllers/adminSecurity.controller.js'

const router = Router()

// Active announcements — any authenticated user
router.get('/announcements/active', authenticate, getActiveAnnouncements)

// All routes below require ADMIN
router.use(authenticate, requireRole('ADMIN'))

// Users
router.get('/users', listUsers)
router.post('/users', createUser)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)
router.post('/users/:id/reset-password', resetPassword)
router.post('/users/:id/suspend', toggleSuspend)

// Classrooms
router.get('/classrooms', listClassrooms)
router.get('/classrooms/:id/students', getClassroomStudents)
router.post('/classrooms/:id/archive', toggleArchive)
router.delete('/classrooms/:id', deleteClassroom)
router.delete('/classrooms/:id/students/:studentId', removeStudent)

// Content
router.get('/content/assignments', listAssignments)
router.get('/content/assignments/:assignmentId/submissions', getSubmissions)
router.put('/content/submissions/:id/grade', overrideGrade)
router.delete('/content/assignments/:id', deleteAssignment)
router.delete('/content/submissions/:id', deleteSubmission)

// Analytics
router.get('/analytics/stats', getPlatformStats)
router.get('/analytics/usage', getUsageStats)

// Platform settings & announcements
router.get('/platform/settings', getSettings)
router.put('/platform/settings', updateSettings)
router.get('/platform/announcements', listAnnouncements)
router.post('/platform/announcements', createAnnouncement)
router.post('/platform/announcements/:id/toggle', toggleAnnouncement)
router.delete('/platform/announcements/:id', deleteAnnouncement)

// Security
router.get('/security/audit-log', getAuditLog)
router.get('/security/audit-actions', getAuditActions)
router.get('/security/users/:userId/history', getUserLoginHistory)
router.post('/security/users/:userId/force-logout', forceLogout)

export default router

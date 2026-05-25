import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import type { AuthRequest } from '../middleware/auth.js'
import { createNotification } from './notification.controller.js'

async function audit(adminId: string, action: string, target?: string, details?: object) {
  await prisma.auditLog.create({ data: { adminId, action, target, details } })
}

export async function listAssignments(req: AuthRequest, res: Response) {
  const { search, classroomId, type } = req.query as Record<string, string>
  const where: any = {}
  if (search) where.title = { contains: search, mode: 'insensitive' }
  if (classroomId) where.classroomId = classroomId
  if (type) where.type = type

  const assignments = await prisma.assignment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      classroom: { include: { teacher: { select: { id: true, name: true } } } },
      _count: { select: { submissions: true, questions: true } },
    },
  })
  res.json(assignments)
}

export async function getSubmissions(req: AuthRequest, res: Response) {
  const { assignmentId } = req.params
  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { submittedAt: 'desc' },
  })
  res.json(submissions)
}

export async function overrideGrade(req: AuthRequest, res: Response) {
  const { id } = req.params
  const { totalScore, curveNote } = req.body
  if (totalScore === undefined) { res.status(400).json({ error: 'totalScore required' }); return }
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { assignment: { select: { title: true } } },
  })
  const updated = await prisma.submission.update({
    where: { id },
    data: { totalScore: Number(totalScore), curvedScore: Number(totalScore), curveNote: curveNote ?? 'Admin override', status: 'GRADED' },
  })
  await audit(req.user!.id, 'GRADE_OVERRIDDEN', `submissionId:${id}`, { totalScore })
  res.json(updated)
  if (submission) {
    createNotification(
      submission.studentId,
      'GRADED',
      'Your assignment was graded',
      `Your submission for "${submission.assignment.title}" has been graded.`,
    ).catch(() => {})
  }
}

export async function deleteAssignment(req: AuthRequest, res: Response) {
  const { id } = req.params
  const assignment = await prisma.assignment.findUnique({ where: { id } })
  if (!assignment) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.assignment.delete({ where: { id } })
  await audit(req.user!.id, 'CONTENT_DELETED', assignment.title, { type: 'assignment' })
  res.json({ success: true })
}

export async function deleteSubmission(req: AuthRequest, res: Response) {
  const { id } = req.params
  await prisma.submission.delete({ where: { id } })
  await audit(req.user!.id, 'CONTENT_DELETED', `submissionId:${id}`, { type: 'submission' })
  res.json({ success: true })
}

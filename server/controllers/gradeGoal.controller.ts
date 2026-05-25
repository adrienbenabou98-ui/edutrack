import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getMyGradeGoals(req: AuthRequest, res: Response) {
  const goals = await prisma.gradeGoal.findMany({
    where: { studentId: req.user!.id },
    include: { classroom: { select: { name: true } } },
  })
  res.json(goals)
}

export async function upsertGradeGoal(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const { targetGrade } = req.body
  if (targetGrade === undefined) { res.status(400).json({ error: 'targetGrade required' }); return }

  // Verify student is enrolled in this classroom
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_classroomId: { studentId: req.user!.id, classroomId } },
  })
  if (!enrollment) { res.status(403).json({ error: 'Not enrolled in this classroom' }); return }

  const goal = await prisma.gradeGoal.upsert({
    where: { studentId_classroomId: { studentId: req.user!.id, classroomId } },
    create: { studentId: req.user!.id, classroomId, targetGrade: Number(targetGrade) },
    update: { targetGrade: Number(targetGrade) },
    include: { classroom: { select: { name: true } } },
  })
  res.json(goal)
}

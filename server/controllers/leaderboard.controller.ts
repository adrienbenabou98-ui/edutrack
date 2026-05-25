import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

function calculatePoints(submission: {
  submittedAt: Date
  totalScore: number | null
  assignment: { dueDate: Date | null; totalPoints: number }
}): number {
  let pts = 0
  const score = submission.totalScore ?? 0
  const total = submission.assignment.totalPoints || 100
  const pct = (score / total) * 100

  // On-time submission bonus
  if (submission.assignment.dueDate && submission.submittedAt <= submission.assignment.dueDate) {
    pts += 10
  }

  if (pct >= 90) pts += 15
  else if (pct >= 75) pts += 8
  else if (pct >= 50) pts += 3

  return pts
}

export async function getLeaderboard(req: AuthRequest, res: Response) {
  const { id: classroomId } = req.params

  // Verify access
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom) { res.status(404).json({ error: 'Classroom not found' }); return }

  const isTeacher = req.user!.role === 'TEACHER' && classroom.teacherId === req.user!.id
  const isAdmin = req.user!.role === 'ADMIN'

  if (!isTeacher && !isAdmin) {
    // Must be an enrolled student
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_classroomId: { studentId: req.user!.id, classroomId } },
    })
    if (!enrollment) { res.status(403).json({ error: 'Forbidden' }); return }
  }

  // Get all enrolled students
  const enrollments = await prisma.enrollment.findMany({
    where: { classroomId },
    include: { student: { select: { id: true, name: true } } },
  })

  // Get all graded submissions for this classroom
  const submissions = await prisma.submission.findMany({
    where: {
      assignment: { classroomId },
      status: 'GRADED',
    },
    include: { assignment: { select: { dueDate: true, totalPoints: true } } },
  })

  // Calculate points per student
  const pointsMap: Record<string, number> = {}
  for (const sub of submissions) {
    const pts = calculatePoints(sub)
    pointsMap[sub.studentId] = (pointsMap[sub.studentId] ?? 0) + pts
  }

  // Build ranked list
  const ranked = enrollments
    .map(e => ({
      studentId: e.student.id,
      name: e.student.name,
      points: pointsMap[e.student.id] ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      isCurrentUser: entry.studentId === req.user!.id,
    }))

  res.json(ranked)
}

import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import type { AuthRequest } from '../middleware/auth.js'

export async function getPlatformStats(req: AuthRequest, res: Response) {
  const [userCounts, classroomCount, assignmentCount, submissionCount, gradedCount] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    prisma.classroom.count(),
    prisma.assignment.count(),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: 'GRADED' } }),
  ])

  const avgScore = await prisma.submission.aggregate({
    _avg: { totalScore: true },
    where: { totalScore: { not: null } },
  })

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  const topClassrooms = await prisma.classroom.findMany({
    orderBy: { enrollments: { _count: 'desc' } },
    take: 5,
    include: {
      teacher: { select: { name: true } },
      _count: { select: { enrollments: true, assignments: true, messages: true } },
    },
  })

  res.json({
    userCounts,
    classroomCount,
    assignmentCount,
    submissionCount,
    gradedCount,
    avgScore: avgScore._avg.totalScore ?? 0,
    recentUsers,
    topClassrooms,
  })
}

export async function getUsageStats(req: AuthRequest, res: Response) {
  // Submissions per classroom
  const classroomActivity = await prisma.classroom.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      teacher: { select: { name: true } },
      _count: { select: { enrollments: true, assignments: true } },
    },
  })

  // Most active teachers
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    include: {
      _count: { select: { taughtClassrooms: true } },
      taughtClassrooms: { include: { _count: { select: { enrollments: true, assignments: true } } } },
    },
    orderBy: { taughtClassrooms: { _count: 'desc' } },
    take: 10,
  })

  const teacherStats = teachers.map(t => ({
    id: t.id,
    name: t.name,
    email: t.email,
    classrooms: t._count.taughtClassrooms,
    totalStudents: t.taughtClassrooms.reduce((s, c) => s + c._count.enrollments, 0),
    totalAssignments: t.taughtClassrooms.reduce((s, c) => s + c._count.assignments, 0),
    lastLogin: t.lastLoginAt,
  }))

  res.json({ classroomActivity, teacherStats })
}

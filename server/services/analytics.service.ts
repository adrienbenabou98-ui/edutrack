import { prisma } from '../prisma/client.js'

export async function getStudentProgress(studentId: string) {
  const submissions = await prisma.submission.findMany({
    where: { studentId },
    include: {
      assignment: { select: { title: true, type: true, classroom: { select: { name: true } } } },
      answers: { include: { question: { select: { tags: true } } } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  const scores = submissions.map(s => ({
    date: s.submittedAt,
    score: s.totalScore ?? 0,
    title: s.assignment.title,
    classroom: s.assignment.classroom.name,
    type: s.assignment.type,
  }))

  const tagErrors: Record<string, { wrong: number; total: number }> = {}
  for (const sub of submissions) {
    for (const ans of sub.answers) {
      for (const tag of ans.question.tags) {
        if (!tagErrors[tag]) tagErrors[tag] = { wrong: 0, total: 0 }
        tagErrors[tag].total++
        if (ans.isCorrect === false) tagErrors[tag].wrong++
      }
    }
  }

  const weakAreas = Object.entries(tagErrors)
    .filter(([, v]) => v.total >= 2 && v.wrong / v.total >= 0.5)
    .sort((a, b) => b[1].wrong / b[1].total - a[1].wrong / a[1].total)
    .slice(0, 5)
    .map(([tag, v]) => ({ tag, errorRate: Math.round((v.wrong / v.total) * 100) }))

  const trend = calculateTrend(scores.map(s => s.score))

  return { scores, weakAreas, trend, totalSubmissions: submissions.length }
}

function calculateTrend(scores: number[]): 'improving' | 'steady' | 'declining' {
  if (scores.length < 3) return 'steady'
  const recent = scores.slice(-3)
  const older = scores.slice(-6, -3)
  if (older.length === 0) return 'steady'
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
  if (recentAvg - olderAvg > 5) return 'improving'
  if (olderAvg - recentAvg > 5) return 'declining'
  return 'steady'
}

export async function getClassroomAnalytics(classroomId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { classroomId },
    include: { student: { select: { id: true, name: true } } },
  })

  const assignments = await prisma.assignment.findMany({
    where: { classroomId },
    include: {
      submissions: {
        include: {
          answers: { include: { question: { select: { tags: true } } } },
          student: { select: { name: true } },
        },
      },
      questions: { select: { id: true, tags: true } },
    },
  })

  const studentStats = enrollments.map(e => {
    const subs = assignments.flatMap(a => a.submissions.filter(s => s.studentId === e.student.id))
    const scores = subs.map(s => s.totalScore ?? 0)
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    const trend = calculateTrend(scores)

    const tagErrors: Record<string, { wrong: number; total: number }> = {}
    for (const sub of subs) {
      for (const ans of sub.answers) {
        for (const tag of ans.question.tags) {
          if (!tagErrors[tag]) tagErrors[tag] = { wrong: 0, total: 0 }
          tagErrors[tag].total++
          if (ans.isCorrect === false) tagErrors[tag].wrong++
        }
      }
    }
    const weakTags = Object.entries(tagErrors)
      .filter(([, v]) => v.total >= 1 && v.wrong / v.total >= 0.5)
      .map(([tag]) => tag)

    return {
      studentId: e.student.id,
      studentName: e.student.name,
      averageScore: avg ? Math.round(avg * 10) / 10 : null,
      submissionCount: subs.length,
      trend,
      weakTags,
      atRisk: avg !== null && avg < 60,
    }
  })

  const classAvg = studentStats.filter(s => s.averageScore !== null)
  const overallAvg = classAvg.length > 0
    ? classAvg.reduce((a, b) => a + (b.averageScore ?? 0), 0) / classAvg.length
    : null

  return {
    studentStats,
    overallAverage: overallAvg ? Math.round(overallAvg * 10) / 10 : null,
    totalStudents: enrollments.length,
    atRiskCount: studentStats.filter(s => s.atRisk).length,
    assignmentCount: assignments.length,
  }
}

import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'
import { avg, effectiveScore, getGrade, categoryFromGrade, DEFAULT_BOUNDARIES, computeBlendedOverall } from '../services/gradeUtils.js'

async function getBoundariesForTeacher(teacherId: string) {
  const b = await prisma.gradeBoundary.findMany({ where: { teacherId }, orderBy: { minScore: 'desc' } })
  return b.length > 0 ? b : DEFAULT_BOUNDARIES.map(d => ({ ...d, id: d.label, teacherId, createdAt: new Date() }))
}

export async function getClassroomGradeTracker(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const [classroom, extAssignments] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        enrollments: { include: { student: { select: { id: true, name: true } } } },
        assignments: {
          where: { status: 'PUBLISHED' },
          include: {
            submissions: { select: { studentId: true, totalScore: true, curvedScore: true } },
          },
        },
      },
    }),
    prisma.externalAssignment.findMany({
      where: { classroomId },
      include: { externalGrades: true },
    }),
  ])
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const boundaries = await getBoundariesForTeacher(req.user!.id)
  const hasComment = await prisma.studentComment.findMany({
    where: { teacherId: req.user!.id, studentId: { in: classroom.enrollments.map(e => e.student.id) } },
    select: { studentId: true },
  })
  const commentedIds = new Set(hasComment.map(c => c.studentId))

  const students = classroom.enrollments.map(e => {
    const scores = classroom.assignments.flatMap(a => {
      const sub = a.submissions.find(s => s.studentId === e.student.id)
      return sub ? [effectiveScore(sub.totalScore, sub.curvedScore)] : []
    })
    const quizAvg = avg(scores)
    const gradedCustom = extAssignments
      .filter(ea => ea.weight > 0)
      .flatMap(ea => {
        const grade = ea.externalGrades.find(g => g.studentId === e.student.id)
        if (!grade || grade.score === null) return []
        return [{ scorePct: (grade.score / ea.totalMarks) * 100, weight: ea.weight }]
      })
    const overall = computeBlendedOverall(quizAvg, gradedCustom)
    const grade = overall !== null ? getGrade(overall, boundaries as any) : null
    return {
      studentId: e.student.id,
      name: e.student.name,
      overall,
      gradeLabel: grade?.label ?? null,
      gradeColour: grade?.colour ?? null,
      category: categoryFromGrade(grade?.label ?? null),
      hasComment: commentedIds.has(e.student.id),
    }
  })

  const counts = { needs_support: 0, meeting: 0, exceeding: 0, ungraded: 0 }
  students.forEach(s => { if (s.category) counts[s.category]++; else counts.ungraded++ })

  res.json({ students, counts, boundaries })
}

export async function getStudentGradeDetail(req: AuthRequest, res: Response) {
  const { studentId } = req.params
  const { classroomId } = req.query as { classroomId: string }

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true, email: true } })
  if (!student) { res.status(404).json({ error: 'Not found' }); return }

  const assignments = await prisma.assignment.findMany({
    where: { classroomId, status: 'PUBLISHED' },
    include: {
      submissions: { where: { studentId }, select: { id: true, totalScore: true, curvedScore: true, curveNote: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const boundaries = await getBoundariesForTeacher(req.user!.id)

  const comment = await prisma.studentComment.findUnique({
    where: { studentId_teacherId: { studentId, teacherId: req.user!.id } },
  })

  // Group by subject → unitName
  type SubjectMap = Record<string, Record<string, typeof assignments>>
  const grouped: SubjectMap = {}
  for (const a of assignments) {
    const subject = a.subject ?? 'General'
    const unit = a.unitName ?? 'Unassigned'
    if (!grouped[subject]) grouped[subject] = {}
    if (!grouped[subject][unit]) grouped[subject][unit] = []
    grouped[subject][unit].push(a)
  }

  const subjects = Object.entries(grouped).map(([subject, units]) => {
    const unitList = Object.entries(units).map(([unitName, asns]) => {
      const rows = asns.map(a => {
        const sub = a.submissions[0] ?? null
        const score = sub ? effectiveScore(sub.totalScore, sub.curvedScore) : null
        const grade = getGrade(score, boundaries as any)
        return { assignmentId: a.id, submissionId: sub?.id ?? null, title: a.title, score, grade, curveNote: sub?.curveNote ?? null, status: sub?.status ?? null }
      })
      const unitAvg = avg(rows.map(r => r.score))
      const unitGrade = getGrade(unitAvg, boundaries as any)
      return { unitName, rows, unitAvg, unitGrade }
    })
    const subjectAvg = avg(unitList.map(u => u.unitAvg))
    const subjectGrade = getGrade(subjectAvg, boundaries as any)
    return { subject, units: unitList, subjectAvg, subjectGrade }
  })

  const quizAvg = avg(subjects.map(s => s.subjectAvg))

  const extAssignments = await prisma.externalAssignment.findMany({
    where: { classroomId },
    include: { externalGrades: { where: { studentId } } },
    orderBy: { date: 'asc' },
  })

  const customItems = extAssignments.map(ea => {
    const grade = ea.externalGrades[0] ?? null
    const scorePct = grade?.score !== null && grade?.score !== undefined
      ? (grade.score / ea.totalMarks) * 100
      : null
    return { id: ea.id, title: ea.title, description: ea.description, weight: ea.weight, totalMarks: ea.totalMarks, score: grade?.score ?? null, scorePct }
  })

  const gradedCustom = customItems
    .filter(c => c.weight > 0 && c.scorePct !== null)
    .map(c => ({ scorePct: c.scorePct!, weight: c.weight }))

  const rawCustomWeight = gradedCustom.reduce((s, g) => s + g.weight, 0)
  const effectiveCustomWeight = Math.min(100, rawCustomWeight)
  const effectiveQuizWeight = Math.max(0, 100 - effectiveCustomWeight)

  const overallAvg = computeBlendedOverall(quizAvg, gradedCustom)
  const overallGrade = getGrade(overallAvg, boundaries as any)

  const customBreakdown = {
    items: customItems,
    quizAvg,
    quizWeight: effectiveQuizWeight,
    totalCustomWeight: effectiveCustomWeight,
  }

  res.json({ student, subjects, overallAvg, overallGrade, boundaries, comment, customBreakdown })
}

export async function saveComment(req: AuthRequest, res: Response) {
  const { studentId } = req.params
  const { strengths, weaknesses, notes } = req.body
  const comment = await prisma.studentComment.upsert({
    where: { studentId_teacherId: { studentId, teacherId: req.user!.id } },
    create: { studentId, teacherId: req.user!.id, strengths, weaknesses, notes },
    update: { strengths, weaknesses, notes },
  })
  res.json(comment)
}

export async function curveSubmissions(req: AuthRequest, res: Response) {
  const { scope, curveType, value, assignmentId, classroomId } = req.body

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  let submissions = await prisma.submission.findMany({
    where: scope === 'assignment'
      ? { assignmentId }
      : { assignment: { classroomId } },
    select: { id: true, totalScore: true, curvedScore: true },
  })

  const curveNote = `Curved: ${curveType} ${value ?? ''} on ${new Date().toLocaleDateString()}`

  const updates = submissions.map(sub => {
    const base = sub.totalScore ?? 0
    let newScore = base
    if (curveType === 'flat') newScore = Math.min(100, base + Number(value))
    else if (curveType === 'multiplier') newScore = Math.min(100, base * Number(value))
    else if (curveType === 'sqrt') newScore = Math.round(Math.sqrt(base / 100) * 100 * 10) / 10
    else if (curveType === 'scale_max') {
      const max = Math.max(...submissions.map(s => s.totalScore ?? 0))
      newScore = max > 0 ? Math.min(100, (base / max) * 100) : base
    }
    return { id: sub.id, curvedScore: Math.round(newScore * 10) / 10, curveNote }
  })

  await Promise.all(updates.map(u => prisma.submission.update({
    where: { id: u.id },
    data: { curvedScore: u.curvedScore, curveNote: u.curveNote },
  })))

  res.json({ updated: updates.length, updates })
}

export async function resetCurve(req: AuthRequest, res: Response) {
  const { submissionIds } = req.body
  await prisma.submission.updateMany({
    where: { id: { in: submissionIds } },
    data: { curvedScore: null, curveNote: null },
  })
  res.json({ ok: true })
}

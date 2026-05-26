import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

// ── Parent Contacts ────────────────────────────────────────────────
export async function getParentContacts(req: AuthRequest, res: Response) {
  const { studentId } = req.params
  const contacts = await prisma.parentContact.findMany({
    where: { studentId, teacherId: req.user!.id },
    orderBy: { date: 'desc' },
  })
  res.json(contacts)
}

export async function addParentContact(req: AuthRequest, res: Response) {
  const { studentId } = req.params
  const { type, summary, outcome, date } = req.body
  if (!type || !summary) { res.status(400).json({ error: 'type and summary required' }); return }
  const contact = await prisma.parentContact.create({
    data: {
      studentId, teacherId: req.user!.id,
      type, summary,
      outcome: outcome ?? null,
      date: date ? new Date(date) : new Date(),
    },
  })
  res.status(201).json(contact)
}

export async function deleteParentContact(req: AuthRequest, res: Response) {
  const contact = await prisma.parentContact.findUnique({ where: { id: req.params.contactId } })
  if (!contact || contact.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.parentContact.delete({ where: { id: req.params.contactId } })
  res.json({ ok: true })
}

// ── Student Timeline ───────────────────────────────────────────────
export async function getStudentTimeline(req: AuthRequest, res: Response) {
  const { studentId } = req.params

  // Verify teacher has access to this student (enrolled in one of teacher's classrooms)
  const teacherClassrooms = await prisma.classroom.findMany({
    where: { teacherId: req.user!.id },
    select: { id: true, name: true },
  })
  const classroomIds = teacherClassrooms.map(c => c.id)
  const enrolled = await prisma.enrollment.findFirst({
    where: { studentId, classroomId: { in: classroomIds } },
  })
  if (!enrolled && req.user!.role !== 'ADMIN') { res.status(403).json({ error: 'Forbidden' }); return }

  const [submissions, comments] = await Promise.all([
    prisma.submission.findMany({
      where: { studentId, assignment: { classroomId: { in: classroomIds } } },
      include: {
        assignment: { select: { title: true, classroomId: true, classroom: { select: { name: true } } } },
        feedback: { select: { aiSuggestion: true, teacherNote: true } },
      },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.studentComment.findMany({
      where: { studentId, teacherId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const events: any[] = []

  for (const s of submissions) {
    events.push({
      type: 'SUBMISSION',
      date: s.submittedAt,
      title: `Submitted: ${s.assignment.title}`,
      detail: s.status === 'GRADED' ? `Score: ${s.totalScore?.toFixed(0)}%` : 'Awaiting grade',
      classroom: s.assignment.classroom.name,
      score: s.totalScore,
      aiFeedback: s.feedback?.aiSuggestion ?? null,
    })
  }

  if (comments.length > 0) {
    const c = comments[0]
    events.push({
      type: 'NOTE',
      date: c.updatedAt,
      title: 'Teacher note updated',
      detail: [c.strengths && `Strengths: ${c.strengths}`, c.weaknesses && `Areas: ${c.weaknesses}`].filter(Boolean).join(' · '),
    })
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  res.json(events)
}

// ── Engagement Score ───────────────────────────────────────────────
export async function getClassroomEngagement(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }

  const enrollments = await prisma.enrollment.findMany({
    where: { classroomId },
    include: { student: { select: { id: true, name: true } } },
  })
  const assignments = await prisma.assignment.findMany({
    where: { classroomId, status: 'PUBLISHED' },
    select: { id: true },
  })
  const totalAssignments = assignments.length

  const results = await Promise.all(enrollments.map(async e => {
    const subs = await prisma.submission.findMany({
      where: { studentId: e.studentId, assignment: { classroomId } },
      select: { totalScore: true, status: true },
    })
    const submissionRate = totalAssignments > 0 ? subs.length / totalAssignments : 0
    const gradedSubs = subs.filter(s => s.status === 'GRADED' && s.totalScore !== null)
    const avgScore = gradedSubs.length > 0 ? gradedSubs.reduce((a, s) => a + (s.totalScore ?? 0), 0) / gradedSubs.length : null
    const score = Math.round(submissionRate * 60 + (avgScore !== null ? (avgScore / 100) * 40 : 0))
    const level = score >= 75 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW'
    return { studentId: e.studentId, name: e.student.name, score, level, submissionRate: Math.round(submissionRate * 100), avgScore }
  }))

  res.json(results.sort((a, b) => b.score - a.score))
}

// ── At-Risk Detection ──────────────────────────────────────────────
export async function getAtRiskStudents(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }

  const enrollments = await prisma.enrollment.findMany({
    where: { classroomId },
    include: { student: { select: { id: true, name: true } } },
  })
  const assignments = await prisma.assignment.findMany({
    where: { classroomId, status: 'PUBLISHED' },
    select: { id: true },
  })
  const totalAssignments = assignments.length

  const flagged: any[] = []
  for (const e of enrollments) {
    const subs = await prisma.submission.findMany({
      where: { studentId: e.studentId, assignment: { classroomId } },
      select: { totalScore: true, status: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    })
    const missing = totalAssignments - subs.length
    const gradedSubs = subs.filter(s => s.status === 'GRADED' && s.totalScore !== null)
    const avgScore = gradedSubs.length > 0 ? gradedSubs.reduce((a, s) => a + (s.totalScore ?? 0), 0) / gradedSubs.length : null
    const reasons: string[] = []
    if (missing >= 1) reasons.push(`${missing} missing assignment${missing > 1 ? 's' : ''}`)
    if (avgScore !== null && avgScore < 50) reasons.push(`Average score ${avgScore.toFixed(0)}%`)
    if (reasons.length > 0) flagged.push({ studentId: e.studentId, name: e.student.name, reasons, avgScore, missing })
  }
  res.json(flagged)
}

// ── Interventions ──────────────────────────────────────────────────
export async function getInterventions(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const interventions = await prisma.intervention.findMany({
    where: { classroomId },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(interventions)
}

export async function getAllInterventions(req: AuthRequest, res: Response) {
  const classrooms = await prisma.classroom.findMany({
    where: { teacherId: req.user!.id },
    select: { id: true },
  })
  const classroomIds = classrooms.map(c => c.id)
  const interventions = await prisma.intervention.findMany({
    where: { classroomId: { in: classroomIds } },
    include: {
      student: { select: { id: true, name: true } },
      classroom: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(interventions)
}

export async function upsertIntervention(req: AuthRequest, res: Response) {
  const { studentId, classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const { stage, notes } = req.body
  const intervention = await prisma.intervention.upsert({
    where: { studentId_classroomId: { studentId, classroomId } },
    create: { studentId, classroomId, teacherId: req.user!.id, stage: stage ?? 'MONITORING', notes: notes ?? null },
    update: { ...(stage && { stage }), ...(notes !== undefined && { notes }) },
    include: { student: { select: { id: true, name: true } } },
  })
  res.json(intervention)
}

export async function deleteIntervention(req: AuthRequest, res: Response) {
  const { studentId, classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.intervention.deleteMany({ where: { studentId, classroomId } })
  res.json({ ok: true })
}

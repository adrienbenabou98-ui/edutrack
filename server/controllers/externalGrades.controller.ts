import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getExternalGrades(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const assignments = await prisma.externalAssignment.findMany({
    where: { classroomId },
    include: { externalGrades: { select: { studentId: true, score: true } } },
    orderBy: { date: 'asc' },
  })
  res.json(assignments)
}

export async function createExternalAssignment(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const { title, description, date, totalMarks, weight, termId } = req.body
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const a = await prisma.externalAssignment.create({
    data: { classroomId, title, description: description || null, date: new Date(date), totalMarks: Number(totalMarks) || 100, weight: Number(weight) || 0, termId: termId ?? null },
    include: { externalGrades: true },
  })
  res.status(201).json(a)
}

export async function updateExternalAssignment(req: AuthRequest, res: Response) {
  const { id } = req.params
  const a = await prisma.externalAssignment.findUnique({ where: { id }, include: { classroom: true } })
  if (!a || a.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const { title, description, date, totalMarks, weight } = req.body
  const updated = await prisma.externalAssignment.update({
    where: { id },
    data: {
      ...(title && { title }),
      description: description !== undefined ? (description || null) : undefined,
      ...(date && { date: new Date(date) }),
      ...(totalMarks !== undefined && { totalMarks: Number(totalMarks) }),
      ...(weight !== undefined && { weight: Number(weight) }),
    },
    include: { externalGrades: true },
  })
  res.json(updated)
}

export async function deleteExternalAssignment(req: AuthRequest, res: Response) {
  const { id } = req.params
  const a = await prisma.externalAssignment.findUnique({ where: { id }, include: { classroom: true } })
  if (!a || a.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.externalAssignment.delete({ where: { id } })
  res.json({ ok: true })
}

export async function setExternalGrade(req: AuthRequest, res: Response) {
  const { assignmentId, studentId } = req.params
  const { score } = req.body
  const a = await prisma.externalAssignment.findUnique({ where: { id: assignmentId }, include: { classroom: true } })
  if (!a || a.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const grade = await prisma.externalGrade.upsert({
    where: { externalAssignmentId_studentId: { externalAssignmentId: assignmentId, studentId } },
    create: { externalAssignmentId: assignmentId, studentId, score: score !== null && score !== '' ? Number(score) : null },
    update: { score: score !== null && score !== '' ? Number(score) : null },
  })
  res.json(grade)
}

export async function curveExternalAssignment(req: AuthRequest, res: Response) {
  const { id } = req.params
  const { curveType, value } = req.body
  const a = await prisma.externalAssignment.findUnique({ where: { id }, include: { classroom: true, externalGrades: true } })
  if (!a || a.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }

  const grades = a.externalGrades.filter(g => g.score !== null)
  const maxScore = grades.length > 0 ? Math.max(...grades.map(g => g.score!)) : 0

  await Promise.all(grades.map(g => {
    const base = g.score!
    let newScore = base
    if (curveType === 'flat') newScore = Math.min(a.totalMarks, base + Number(value))
    else if (curveType === 'multiplier') newScore = Math.min(a.totalMarks, base * Number(value))
    else if (curveType === 'sqrt') newScore = Math.round(Math.sqrt(base / a.totalMarks) * a.totalMarks * 10) / 10
    else if (curveType === 'scale_max') newScore = maxScore > 0 ? Math.min(a.totalMarks, (base / maxScore) * a.totalMarks) : base
    return prisma.externalGrade.update({ where: { id: g.id }, data: { score: Math.round(newScore * 10) / 10 } })
  }))

  const updated = await prisma.externalAssignment.findUnique({ where: { id }, include: { externalGrades: true } })
  res.json(updated)
}

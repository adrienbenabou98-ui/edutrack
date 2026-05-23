import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getUnits(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const units = await prisma.unit.findMany({
    where: { classroomId },
    include: {
      lessons: {
        include: { understandings: { select: { studentId: true, understandingLevelId: true } } },
        orderBy: { order: 'asc' },
      },
      unitAssessments: { select: { studentId: true, score: true, totalMarks: true } },
    },
    orderBy: { order: 'asc' },
  })
  res.json(units)
}

export async function createUnit(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const { name, termId } = req.body
  if (!name) { res.status(400).json({ error: 'name required' }); return }
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const count = await prisma.unit.count({ where: { classroomId } })
  const unit = await prisma.unit.create({
    data: { classroomId, name, order: count, termId: termId ?? null },
    include: { lessons: { include: { understandings: true } }, unitAssessments: true },
  })
  res.status(201).json(unit)
}

export async function updateUnit(req: AuthRequest, res: Response) {
  const { id } = req.params
  const unit = await prisma.unit.findUnique({ where: { id }, include: { classroom: true } })
  if (!unit || unit.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const { name } = req.body
  const updated = await prisma.unit.update({
    where: { id },
    data: { ...(name && { name }) },
    include: { lessons: { include: { understandings: true }, orderBy: { order: 'asc' } }, unitAssessments: true },
  })
  res.json(updated)
}

export async function deleteUnit(req: AuthRequest, res: Response) {
  const { id } = req.params
  const unit = await prisma.unit.findUnique({ where: { id }, include: { classroom: true } })
  if (!unit || unit.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.unit.delete({ where: { id } })
  res.json({ ok: true })
}

export async function addLesson(req: AuthRequest, res: Response) {
  const { unitId } = req.params
  const { title, date } = req.body
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, include: { classroom: true } })
  if (!unit || unit.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const count = await prisma.lesson.count({ where: { unitId } })
  const lesson = await prisma.lesson.create({
    data: { unitId, title: title || `Lesson ${count + 1}`, date: date ? new Date(date) : null, order: count },
    include: { understandings: true },
  })
  res.status(201).json(lesson)
}

export async function updateLesson(req: AuthRequest, res: Response) {
  const { lessonId } = req.params
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { unit: { include: { classroom: true } } } })
  if (!lesson || lesson.unit.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const { title, date } = req.body
  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(title !== undefined && { title }),
      ...(date !== undefined && { date: date ? new Date(date) : null }),
    },
    include: { understandings: true },
  })
  res.json(updated)
}

export async function deleteLesson(req: AuthRequest, res: Response) {
  const { lessonId } = req.params
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { unit: { include: { classroom: true } } } })
  if (!lesson || lesson.unit.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.lesson.delete({ where: { id: lessonId } })
  res.json({ ok: true })
}

export async function setLessonUnderstanding(req: AuthRequest, res: Response) {
  const { lessonId, studentId } = req.params
  const { understandingLevelId } = req.body
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { unit: { include: { classroom: true } } } })
  if (!lesson || lesson.unit.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }

  if (understandingLevelId === null) {
    await prisma.lessonUnderstanding.deleteMany({ where: { lessonId, studentId } })
    res.json({ deleted: true }); return
  }

  const u = await prisma.lessonUnderstanding.upsert({
    where: { lessonId_studentId: { lessonId, studentId } },
    create: { lessonId, studentId, understandingLevelId },
    update: { understandingLevelId },
  })
  res.json(u)
}

export async function setUnitAssessment(req: AuthRequest, res: Response) {
  const { unitId, studentId } = req.params
  const { score, totalMarks } = req.body
  const unit = await prisma.unit.findUnique({ where: { id: unitId }, include: { classroom: true } })
  if (!unit || unit.classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const assessment = await prisma.unitAssessment.upsert({
    where: { unitId_studentId: { unitId, studentId } },
    create: { unitId, studentId, score: score !== null && score !== '' ? Number(score) : null, totalMarks: Number(totalMarks) || 100 },
    update: { score: score !== null && score !== '' ? Number(score) : null, ...(totalMarks !== undefined && { totalMarks: Number(totalMarks) }) },
  })
  res.json(assessment)
}

import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function listTemplates(req: AuthRequest, res: Response) {
  const templates = await prisma.assignmentTemplate.findMany({
    where: { teacherId: req.user!.id },
    include: { questions: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(templates)
}

export async function createTemplate(req: AuthRequest, res: Response) {
  const { title, type, instructions, subject, yearLevel, questions } = req.body
  if (!title || !type) { res.status(400).json({ error: 'title and type required' }); return }
  const template = await prisma.assignmentTemplate.create({
    data: {
      teacherId: req.user!.id,
      title, type,
      instructions: instructions ?? '',
      subject: subject ?? null,
      yearLevel: yearLevel ? Number(yearLevel) : null,
      questions: questions?.length ? {
        create: questions.map((q: any, i: number) => ({
          text: q.text, type: q.type,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer ?? null,
          points: q.points ?? 10,
          order: i,
        })),
      } : undefined,
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  res.status(201).json(template)
}

export async function updateTemplate(req: AuthRequest, res: Response) {
  const tmpl = await prisma.assignmentTemplate.findUnique({ where: { id: req.params.id } })
  if (!tmpl || tmpl.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const { title, type, instructions, subject, yearLevel, questions } = req.body
  await prisma.templateQuestion.deleteMany({ where: { templateId: tmpl.id } })
  const updated = await prisma.assignmentTemplate.update({
    where: { id: tmpl.id },
    data: {
      ...(title && { title }), ...(type && { type }),
      ...(instructions !== undefined && { instructions }),
      ...(subject !== undefined && { subject }),
      ...(yearLevel !== undefined && { yearLevel: yearLevel ? Number(yearLevel) : null }),
      questions: questions?.length ? {
        create: questions.map((q: any, i: number) => ({
          text: q.text, type: q.type,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer ?? null,
          points: q.points ?? 10,
          order: i,
        })),
      } : undefined,
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  res.json(updated)
}

export async function deleteTemplate(req: AuthRequest, res: Response) {
  const tmpl = await prisma.assignmentTemplate.findUnique({ where: { id: req.params.id } })
  if (!tmpl || tmpl.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.assignmentTemplate.delete({ where: { id: tmpl.id } })
  res.json({ ok: true })
}

export async function useTemplate(req: AuthRequest, res: Response) {
  const tmpl = await prisma.assignmentTemplate.findUnique({
    where: { id: req.params.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  if (!tmpl || tmpl.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const { classroomId, title, dueDate } = req.body
  if (!classroomId) { res.status(400).json({ error: 'classroomId required' }); return }
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) { res.status(403).json({ error: 'Not your classroom' }); return }
  const assignment = await prisma.assignment.create({
    data: {
      classroomId,
      title: title ?? tmpl.title,
      instructions: tmpl.instructions,
      type: tmpl.type,
      dueDate: dueDate ? new Date(dueDate) : null,
      subject: tmpl.subject ?? null,
      questions: {
        create: tmpl.questions.map(q => ({
          text: q.text, type: q.type,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer ?? null,
          points: q.points,
          tags: [],
        })),
      },
    },
    include: { questions: true },
  })
  res.status(201).json(assignment)
}

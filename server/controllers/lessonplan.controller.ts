import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getLessonPlans(req: AuthRequest, res: Response) {
  const { weekStart } = req.query
  if (!weekStart) { res.status(400).json({ error: 'weekStart required' }); return }
  const start = new Date(weekStart as string)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  const plans = await prisma.lessonPlan.findMany({
    where: { teacherId: req.user!.id, weekStart: { gte: start, lt: end } },
    include: { classroom: { select: { id: true, name: true } } },
  })
  res.json(plans)
}

export async function upsertLessonPlan(req: AuthRequest, res: Response) {
  const { id, weekStart, dayOfWeek, period, topic, notes, color, classroomId } = req.body
  if (!weekStart || dayOfWeek === undefined || period === undefined || !topic) {
    res.status(400).json({ error: 'weekStart, dayOfWeek, period, topic required' }); return
  }
  if (id) {
    const existing = await prisma.lessonPlan.findUnique({ where: { id } })
    if (!existing || existing.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: { topic, notes: notes ?? null, color: color ?? '#6366f1', classroomId: classroomId ?? null },
      include: { classroom: { select: { id: true, name: true } } },
    })
    res.json(updated)
  } else {
    const plan = await prisma.lessonPlan.create({
      data: {
        teacherId: req.user!.id,
        weekStart: new Date(weekStart),
        dayOfWeek: Number(dayOfWeek),
        period: Number(period),
        topic,
        notes: notes ?? null,
        color: color ?? '#6366f1',
        classroomId: classroomId ?? null,
      },
      include: { classroom: { select: { id: true, name: true } } },
    })
    res.status(201).json(plan)
  }
}

export async function deleteLessonPlan(req: AuthRequest, res: Response) {
  const plan = await prisma.lessonPlan.findUnique({ where: { id: req.params.id } })
  if (!plan || plan.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.lessonPlan.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

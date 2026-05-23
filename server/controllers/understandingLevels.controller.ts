import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

const DEFAULT_LEVELS = [
  { label: 'Very Good',     colour: '#4ade80', order: 0, isAbsent: false, category: 'EXCEEDING' as const },
  { label: 'Understood',    colour: '#facc15', order: 1, isAbsent: false, category: 'MEETING'   as const },
  { label: 'Needs Support', colour: '#f87171', order: 2, isAbsent: false, category: 'SUPPORT'   as const },
  { label: 'Missed Lesson', colour: '#d1d5db', order: 3, isAbsent: true,  category: 'ABSENT'    as const },
]

async function ensureDefaults(teacherId: string) {
  const count = await prisma.understandingLevel.count({ where: { teacherId } })
  if (count === 0) {
    await prisma.understandingLevel.createMany({
      data: DEFAULT_LEVELS.map(l => ({ ...l, teacherId })),
    })
  }
}

export async function getLevels(req: AuthRequest, res: Response) {
  await ensureDefaults(req.user!.id)
  const levels = await prisma.understandingLevel.findMany({
    where: { teacherId: req.user!.id },
    orderBy: { order: 'asc' },
  })
  res.json(levels)
}

export async function createLevel(req: AuthRequest, res: Response) {
  const { label, colour, isAbsent, category } = req.body
  if (!label || !colour) { res.status(400).json({ error: 'label and colour required' }); return }
  const count = await prisma.understandingLevel.count({ where: { teacherId: req.user!.id } })
  if (isAbsent) {
    await prisma.understandingLevel.updateMany({ where: { teacherId: req.user!.id }, data: { isAbsent: false } })
  }
  const level = await prisma.understandingLevel.create({
    data: { teacherId: req.user!.id, label, colour, order: count, isAbsent: !!isAbsent, category: category ?? 'SUPPORT' },
  })
  res.status(201).json(level)
}

export async function updateLevel(req: AuthRequest, res: Response) {
  const { id } = req.params
  const level = await prisma.understandingLevel.findUnique({ where: { id } })
  if (!level || level.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const { label, colour, isAbsent, category } = req.body
  if (isAbsent) {
    await prisma.understandingLevel.updateMany({
      where: { teacherId: req.user!.id, id: { not: id } },
      data: { isAbsent: false },
    })
  }
  const updated = await prisma.understandingLevel.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(colour !== undefined && { colour }),
      ...(isAbsent !== undefined && { isAbsent: !!isAbsent }),
      ...(category !== undefined && { category }),
    },
  })
  res.json(updated)
}

export async function deleteLevel(req: AuthRequest, res: Response) {
  const { id } = req.params
  const level = await prisma.understandingLevel.findUnique({ where: { id } })
  if (!level || level.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const removedFromLessons = await prisma.lessonUnderstanding.count({ where: { understandingLevelId: id } })
  await prisma.understandingLevel.delete({ where: { id } })
  res.json({ ok: true, removedFromLessons })
}

export async function reorderLevels(req: AuthRequest, res: Response) {
  const { orderedIds } = req.body as { orderedIds: string[] }
  await Promise.all(
    orderedIds.map((levelId, idx) =>
      prisma.understandingLevel.updateMany({
        where: { id: levelId, teacherId: req.user!.id },
        data: { order: idx },
      })
    )
  )
  const levels = await prisma.understandingLevel.findMany({
    where: { teacherId: req.user!.id },
    orderBy: { order: 'asc' },
  })
  res.json(levels)
}

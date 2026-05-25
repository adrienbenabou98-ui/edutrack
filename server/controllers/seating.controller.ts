import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getSeating(req: AuthRequest, res: Response) {
  const { id: classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const chart = await prisma.seatingChart.findUnique({ where: { classroomId } })
  if (!chart) {
    res.json({ classroomId, rows: 5, cols: 6, seats: [] })
  } else {
    res.json(chart)
  }
}

export async function saveSeating(req: AuthRequest, res: Response) {
  const { id: classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const { rows, cols, seats } = req.body
  const chart = await prisma.seatingChart.upsert({
    where: { classroomId },
    create: {
      classroomId,
      rows: rows ?? 5,
      cols: cols ?? 6,
      seats: seats ?? [],
    },
    update: {
      rows: rows ?? 5,
      cols: cols ?? 6,
      seats: seats ?? [],
    },
  })
  res.json(chart)
}

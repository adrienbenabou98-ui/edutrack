import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getAnnouncements(req: Request, res: Response) {
  const teacherId = req.user!.id
  const items = await prisma.teacherAnnouncement.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, body: true, classroomId: true, createdAt: true },
  })
  res.json(items)
}

export async function createAnnouncement(req: Request, res: Response) {
  const teacherId = req.user!.id
  const { title, body, classroomId } = req.body
  if (!title || typeof title !== 'string' || !body || typeof body !== 'string') {
    res.status(400).json({ error: 'title and body are required' }); return
  }
  if (classroomId) {
    const room = await prisma.classroom.findFirst({ where: { id: classroomId, teacherId } })
    if (!room) { res.status(403).json({ error: 'Not your classroom' }); return }
  }
  const announcement = await prisma.teacherAnnouncement.create({
    data: { teacherId, classroomId: classroomId ?? null, title: title.slice(0, 200), body: body.slice(0, 5000) },
    select: { id: true, title: true, body: true, classroomId: true, createdAt: true },
  })
  res.status(201).json(announcement)
}

export async function deleteAnnouncement(req: Request, res: Response) {
  const teacherId = req.user!.id
  const { id } = req.params
  const ann = await prisma.teacherAnnouncement.findUnique({ where: { id } })
  if (!ann || ann.teacherId !== teacherId) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.teacherAnnouncement.delete({ where: { id } })
  res.json({ ok: true })
}

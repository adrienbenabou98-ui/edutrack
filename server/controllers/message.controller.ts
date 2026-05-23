import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function sendMessage(req: AuthRequest, res: Response) {
  const { recipientId, classroomId, body } = req.body
  if (!body?.trim()) { res.status(400).json({ error: 'Message body required' }); return }
  if (!recipientId && !classroomId) { res.status(400).json({ error: 'recipientId or classroomId required' }); return }
  if (req.user!.role === 'STUDENT' && !recipientId) {
    res.status(403).json({ error: 'Students can only send direct messages' }); return
  }
  const message = await prisma.message.create({
    data: { senderId: req.user!.id, recipientId: recipientId ?? null, classroomId: classroomId ?? null, body },
    include: { sender: { select: { name: true, role: true } } },
  })
  res.status(201).json(message)
}

export async function getMyMessages(req: AuthRequest, res: Response) {
  const userId = req.user!.id
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { recipientId: userId },
        { senderId: userId },
        ...(req.user!.role === 'STUDENT' ? [{
          classroom: { enrollments: { some: { studentId: userId } } },
          recipientId: null,
        }] : []),
      ],
    },
    include: { sender: { select: { id: true, name: true, role: true } }, classroom: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(messages)
}

export async function getClassroomMessages(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const messages = await prisma.message.findMany({
    where: { classroomId, recipientId: null },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(messages)
}

export async function markRead(req: AuthRequest, res: Response) {
  await prisma.message.updateMany({
    where: { recipientId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  })
  res.json({ ok: true })
}

export async function getUnreadCount(req: AuthRequest, res: Response) {
  const count = await prisma.message.count({
    where: { recipientId: req.user!.id, readAt: null },
  })
  res.json({ count })
}

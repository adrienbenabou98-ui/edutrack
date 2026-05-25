import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string,
) {
  await prisma.notification.create({ data: { userId, type, title, message, link: link ?? null } })
}

export async function getNotifications(req: AuthRequest, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(notifications)
}

export async function markRead(req: AuthRequest, res: Response) {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!notification || notification.userId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } })
  res.json(updated)
}

export async function markAllRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, read: false }, data: { read: true } })
  res.json({ ok: true })
}

export async function deleteNotification(req: AuthRequest, res: Response) {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!notification || notification.userId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  await prisma.notification.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

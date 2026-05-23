import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import type { AuthRequest } from '../middleware/auth.js'

export async function getAuditLog(req: AuthRequest, res: Response) {
  const { action, adminId, limit = '100' } = req.query as Record<string, string>
  const where: any = {}
  if (action) where.action = action
  if (adminId) where.adminId = adminId

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    include: { admin: { select: { id: true, name: true, email: true } } },
  })
  res.json(logs)
}

export async function getUserLoginHistory(req: AuthRequest, res: Response) {
  const { userId } = req.params
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, lastLoginAt: true, createdAt: true, suspended: true },
  })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  const auditEntries = await prisma.auditLog.findMany({
    where: { OR: [{ adminId: userId }, { target: { contains: userId } }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { admin: { select: { name: true } } },
  })

  res.json({ user, auditEntries })
}

export async function forceLogout(req: AuthRequest, res: Response) {
  const { userId } = req.params
  if (userId === req.user!.id) {
    res.status(400).json({ error: 'You cannot force-logout yourself' }); return
  }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } })
  await prisma.auditLog.create({
    data: { adminId: req.user!.id, action: 'FORCE_LOGOUT', target: user.name, details: { userId } },
  })
  res.json({ success: true })
}

export async function getAuditActions(_req: AuthRequest, res: Response) {
  const actions = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ['action'],
  })
  res.json(actions.map(a => a.action))
}

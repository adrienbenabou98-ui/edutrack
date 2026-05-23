import { Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma/client.js'
import type { AuthRequest } from '../middleware/auth.js'

function safeUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    suspended: u.suspended,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    _count: u._count,
  }
}

export async function listUsers(req: AuthRequest, res: Response) {
  const { search, role, status } = req.query as Record<string, string>

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (role && ['TEACHER', 'STUDENT', 'ADMIN'].includes(role)) where.role = role
  if (status === 'active') where.suspended = false
  if (status === 'suspended') where.suspended = true

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      suspended: true, lastLoginAt: true, createdAt: true,
      _count: { select: { taughtClassrooms: true, enrollments: true, submissions: true } },
    },
  })

  const totals = await prisma.user.groupBy({ by: ['role'], _count: { id: true } })
  const suspended = await prisma.user.count({ where: { suspended: true } })

  res.json({ users, totals, suspended })
}

export async function createUser(req: AuthRequest, res: Response) {
  const { name, email, password, role } = req.body
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'name, email, password and role are required' }); return
  }
  if (!['TEACHER', 'STUDENT', 'ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' }); return
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true, suspended: true, lastLoginAt: true, createdAt: true },
  })
  res.status(201).json(user)
}

export async function updateUser(req: AuthRequest, res: Response) {
  const { id } = req.params
  const { name, email, role } = req.body
  const callerId = req.user!.id

  if (!name && !email && !role) {
    res.status(400).json({ error: 'Nothing to update' }); return
  }
  if (role && !['TEACHER', 'STUDENT', 'ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' }); return
  }
  if (role && role !== 'ADMIN' && id === callerId) {
    res.status(400).json({ error: 'You cannot demote yourself' }); return
  }
  if (email) {
    const clash = await prisma.user.findFirst({ where: { email, NOT: { id } } })
    if (clash) { res.status(409).json({ error: 'Email already in use' }); return }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { ...(name && { name }), ...(email && { email }), ...(role && { role }) },
    select: { id: true, name: true, email: true, role: true, suspended: true, lastLoginAt: true, createdAt: true },
  })
  res.json(user)
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params
  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own account' }); return
  }
  await prisma.user.delete({ where: { id } })
  res.json({ success: true })
}

export async function resetPassword(req: AuthRequest, res: Response) {
  const { id } = req.params
  const newPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase()
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id }, data: { passwordHash } })
  res.json({ newPassword })
}

export async function toggleSuspend(req: AuthRequest, res: Response) {
  const { id } = req.params
  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot suspend yourself' }); return
  }
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  const updated = await prisma.user.update({
    where: { id },
    data: { suspended: !user.suspended },
    select: { id: true, name: true, email: true, role: true, suspended: true, lastLoginAt: true, createdAt: true },
  })
  res.json(updated)
}

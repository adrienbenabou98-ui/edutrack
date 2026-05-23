import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma/client.js'

function generateTokens(user: { id: string; role: string; email?: string | null }) {
  const access = jwt.sign(
    { id: user.id, role: user.role, email: user.email ?? '' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  )
  const refresh = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  )
  return { access, refresh }
}

export async function register(req: Request, res: Response) {
  const { email, password, name, role } = req.body
  if (!email || !password || !name || !role) {
    res.status(400).json({ error: 'All fields are required' })
    return
  }
  if (!['TEACHER', 'STUDENT', 'ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Role must be TEACHER, STUDENT, or ADMIN' })
    return
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role },
  })
  const tokens = generateTokens(user)
  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...tokens,
  })
}

export async function login(req: Request, res: Response) {
  const { email, password, username, classCode, classPassword } = req.body

  // Year 1-6 username login — just username + class password, no class code needed
  if (username && classPassword && !email) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { enrollments: { include: { classroom: true } } },
    })
    if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return }
    if (user.suspended) { res.status(403).json({ error: 'Account suspended' }); return }
    const matchingClass = user.enrollments.find(e => e.classroom.classPassword === classPassword)
    if (!matchingClass) { res.status(401).json({ error: 'Invalid credentials' }); return }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const tokens = generateTokens(user)
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, ...tokens })
    return
  }

  // Standard email/password login
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  if (user.suspended) {
    res.status(403).json({ error: 'Account suspended. Please contact your administrator.' })
    return
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  const tokens = generateTokens(user)
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...tokens,
  })
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' })
    return
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string }
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }
    const tokens = generateTokens(user)
    res.json(tokens)
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
}

export async function me(req: Request, res: Response) {
  const authReq = req as any
  const user = await prisma.user.findUnique({
    where: { id: authReq.user.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  res.json(user)
}

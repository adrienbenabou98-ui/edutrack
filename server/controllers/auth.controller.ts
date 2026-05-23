import { Request, Response } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma/client.js'

function generateTokens(user: { id: string; role: string; email?: string | null; tokenVersion?: number }) {
  const tv = user.tokenVersion ?? 0
  const access = jwt.sign(
    { id: user.id, role: user.role, email: user.email ?? '', tv },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  )
  // tv included in refresh token so force-logout invalidates refresh tokens too
  const refresh = jwt.sign(
    { id: user.id, tv },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  )
  return { access, refresh }
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password too long (max 128 characters)'
  if (!/[0-9!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(password))
    return 'Password must contain at least one number or special character'
  return null
}

export async function register(req: Request, res: Response) {
  const { email, password, name, role } = req.body
  if (!email || !password || !name || !role) {
    res.status(400).json({ error: 'All fields are required' })
    return
  }
  // Self-registration is only allowed for TEACHER and STUDENT
  if (!['TEACHER', 'STUDENT'].includes(role)) {
    res.status(400).json({ error: 'Role must be TEACHER or STUDENT' })
    return
  }
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
    res.status(400).json({ error: 'Name must be between 1 and 100 characters' })
    return
  }
  if (typeof email !== 'string' || email.length > 255) {
    res.status(400).json({ error: 'Invalid email' })
    return
  }
  const pwError = validatePassword(password)
  if (pwError) { res.status(400).json({ error: pwError }); return }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email: email.toLowerCase().trim(), passwordHash, name: name.trim(), role },
  })
  const tokens = generateTokens(user)
  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    ...tokens,
  })
}

export async function login(req: Request, res: Response) {
  const { email, password, username, classCode } = req.body

  // Username + class code login — for teacher-created student accounts
  if (username && classCode && !email) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { enrollments: { include: { classroom: true } } },
    })
    if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return }
    if (user.suspended) { res.status(403).json({ error: 'Account suspended' }); return }
    const matchingClass = user.enrollments.find(e => e.classroom.classCode === classCode)
    if (!matchingClass) { res.status(401).json({ error: 'Invalid username or class code' }); return }
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
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string; tv?: number }
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }
    if (user.suspended) {
      res.status(403).json({ error: 'Account suspended' })
      return
    }
    // If token carries tv, verify it matches current tokenVersion (honours force-logout)
    if (payload.tv !== undefined && payload.tv !== user.tokenVersion) {
      res.status(401).json({ error: 'Session expired' })
      return
    }
    const tokens = generateTokens(user)
    res.json(tokens)
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  res.json(user)
}

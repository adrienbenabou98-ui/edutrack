import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { authenticate } from '../middleware/auth.js'
import { getAuthUrl, exchangeCode } from '../services/google.service.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

// GET /api/google/status
router.get('/status', authenticate, async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { googleCalendarLinked: true },
  })
  res.json({ linked: user?.googleCalendarLinked ?? false })
})

// GET /api/google/connect — returns OAuth URL; frontend opens it
router.get('/connect', authenticate, (req: any, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_google_client_id') {
    res.status(503).json({ error: 'Google Calendar integration is not configured on this server.' })
    return
  }
  const state = jwt.sign(
    { userId: req.user!.id, role: req.user!.role },
    process.env.JWT_SECRET!,
    { expiresIn: '10m' },
  )
  res.json({ url: getAuthUrl(state) })
})

// GET /api/google/callback — redirect from Google after OAuth consent
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>
  const frontendBase = process.env.FRONTEND_URL ?? ''

  if (error || !code || !state) {
    res.redirect(`${frontendBase}/settings?google=error`)
    return
  }

  try {
    const payload = jwt.verify(state, process.env.JWT_SECRET!) as { userId: string; role: string }
    const tokens = await exchangeCode(code)

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        googleAccessToken: tokens.access_token ?? null,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleCalendarLinked: true,
      },
    })

    const role = payload.role.toLowerCase()
    const settingsPath = role === 'teacher' ? '/teacher/settings' : '/student/settings'
    res.redirect(`${frontendBase}${settingsPath}?google=connected`)
  } catch (err) {
    // Log message only — GaxiosError may include client_secret in request body
    console.error('[Google OAuth] callback error:', (err as any)?.message ?? String(err))
    res.redirect(`${frontendBase}/settings?google=error`)
  }
})

// POST /api/google/disconnect
router.post('/disconnect', authenticate, async (req: any, res) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleCalendarLinked: false,
    },
  })
  res.json({ ok: true })
})

export default router

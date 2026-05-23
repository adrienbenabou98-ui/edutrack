import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import type { AuthRequest } from '../middleware/auth.js'

const DEFAULT_SETTINGS = [
  { key: 'aiEnabled',                    value: 'true'  },
  { key: 'pdfExportEnabled',             value: 'true'  },
  { key: 'studentRegistrationEnabled',   value: 'true'  },
  { key: 'analyticsEnabled',             value: 'true'  },
]

export async function getSettings(req: AuthRequest, res: Response) {
  // Ensure defaults exist
  for (const s of DEFAULT_SETTINGS) {
    await prisma.platformSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }
  const settings = await prisma.platformSetting.findMany()
  res.json(settings)
}

export async function updateSettings(req: AuthRequest, res: Response) {
  const updates: { key: string; value: string }[] = req.body
  if (!Array.isArray(updates)) { res.status(400).json({ error: 'Expected array of { key, value }' }); return }
  const results = await Promise.all(
    updates.map(u => prisma.platformSetting.update({ where: { key: u.key }, data: { value: u.value } }))
  )
  res.json(results)
}

export async function listAnnouncements(req: AuthRequest, res: Response) {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })
  res.json(announcements)
}

export async function createAnnouncement(req: AuthRequest, res: Response) {
  const { message } = req.body
  if (!message?.trim()) { res.status(400).json({ error: 'Message required' }); return }
  const ann = await prisma.announcement.create({
    data: { message, createdById: req.user!.id },
    include: { createdBy: { select: { name: true } } },
  })
  res.status(201).json(ann)
}

export async function toggleAnnouncement(req: AuthRequest, res: Response) {
  const { id } = req.params
  const ann = await prisma.announcement.findUnique({ where: { id } })
  if (!ann) { res.status(404).json({ error: 'Not found' }); return }
  const updated = await prisma.announcement.update({ where: { id }, data: { active: !ann.active } })
  res.json(updated)
}

export async function deleteAnnouncement(req: AuthRequest, res: Response) {
  const { id } = req.params
  await prisma.announcement.delete({ where: { id } })
  res.json({ success: true })
}

// Public endpoint — any authenticated user can read active announcements
export async function getActiveAnnouncements(req: AuthRequest, res: Response) {
  const announcements = await prisma.announcement.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, message: true, createdAt: true },
  })
  res.json(announcements)
}

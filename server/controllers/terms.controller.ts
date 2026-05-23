import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function listTerms(req: AuthRequest, res: Response) {
  const terms = await prisma.term.findMany({
    where: { teacherId: req.user!.id },
    orderBy: { startDate: 'desc' },
  })
  res.json(terms)
}

export async function getActiveTerm(req: AuthRequest, res: Response) {
  const teacherId = req.user!.id
  const terms = await prisma.term.findMany({
    where: { teacherId },
    orderBy: { startDate: 'desc' },
  })
  if (terms.length === 0) { res.json({ activeTerm: null, autoSwitched: false, newTermName: null }); return }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const shouldBeActive = terms.find(t => {
    const start = new Date(t.startDate); start.setHours(0, 0, 0, 0)
    const end = new Date(t.endDate); end.setHours(23, 59, 59, 999)
    return today >= start && today <= end
  })

  const currentActive = terms.find(t => t.isActive)
  let autoSwitched = false
  let activeTerm = currentActive ?? null
  let newTermName: string | null = null

  if (shouldBeActive && shouldBeActive.id !== currentActive?.id) {
    await prisma.$transaction([
      prisma.term.updateMany({ where: { teacherId }, data: { isActive: false } }),
      prisma.term.update({ where: { id: shouldBeActive.id }, data: { isActive: true } }),
    ])
    autoSwitched = true
    activeTerm = { ...shouldBeActive, isActive: true }
    newTermName = shouldBeActive.name
  } else if (!shouldBeActive && !currentActive && terms.length > 0) {
    await prisma.term.update({ where: { id: terms[0].id }, data: { isActive: true } })
    activeTerm = { ...terms[0], isActive: true }
  }

  res.json({ activeTerm, autoSwitched, newTermName })
}

export async function createTerm(req: AuthRequest, res: Response) {
  const { name, startDate, endDate } = req.body
  if (!name || !startDate || !endDate) {
    res.status(400).json({ error: 'name, startDate and endDate are required' }); return
  }
  const term = await prisma.term.create({
    data: { teacherId: req.user!.id, name, startDate: new Date(startDate), endDate: new Date(endDate) },
  })
  res.status(201).json(term)
}

export async function updateTerm(req: AuthRequest, res: Response) {
  const { id } = req.params
  const term = await prisma.term.findUnique({ where: { id } })
  if (!term || term.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  const { name, startDate, endDate } = req.body
  const updated = await prisma.term.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
    },
  })
  res.json(updated)
}

export async function deleteTerm(req: AuthRequest, res: Response) {
  const { id } = req.params
  const term = await prisma.term.findUnique({ where: { id } })
  if (!term || term.teacherId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.term.delete({ where: { id } })
  res.json({ ok: true })
}

export async function setActiveTerm(req: AuthRequest, res: Response) {
  const { id } = req.params
  const teacherId = req.user!.id
  const term = await prisma.term.findUnique({ where: { id } })
  if (!term || term.teacherId !== teacherId) { res.status(403).json({ error: 'Forbidden' }); return }
  await prisma.$transaction([
    prisma.term.updateMany({ where: { teacherId }, data: { isActive: false } }),
    prisma.term.update({ where: { id }, data: { isActive: true } }),
  ])
  res.json({ ok: true })
}

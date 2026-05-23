import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'
import { DEFAULT_BOUNDARIES } from '../services/gradeUtils.js'

export async function getBoundaries(req: AuthRequest, res: Response) {
  let boundaries = await prisma.gradeBoundary.findMany({
    where: { teacherId: req.user!.id },
    orderBy: { minScore: 'desc' },
  })
  if (boundaries.length === 0) {
    boundaries = await prisma.gradeBoundary.createManyAndReturn({
      data: DEFAULT_BOUNDARIES.map(b => ({ ...b, teacherId: req.user!.id })),
    })
    boundaries.sort((a, b) => b.minScore - a.minScore)
  }
  res.json(boundaries)
}

export async function saveBoundaries(req: AuthRequest, res: Response) {
  const { boundaries } = req.body as { boundaries: { label: string; minScore: number; maxScore: number; colour: string }[] }
  if (!Array.isArray(boundaries) || boundaries.length === 0) {
    res.status(400).json({ error: 'boundaries array required' }); return
  }
  await prisma.gradeBoundary.deleteMany({ where: { teacherId: req.user!.id } })
  const created = await prisma.gradeBoundary.createManyAndReturn({
    data: boundaries.map(b => ({ ...b, teacherId: req.user!.id })),
  })
  res.json(created.sort((a, b) => b.minScore - a.minScore))
}

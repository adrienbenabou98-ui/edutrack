import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getRubrics(req: AuthRequest, res: Response) {
  const rubrics = await prisma.rubric.findMany({
    where: { teacherId: req.user!.id },
    include: { criteria: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rubrics)
}

export async function createRubric(req: AuthRequest, res: Response) {
  const { name, criteria } = req.body
  if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return }
  const rubric = await prisma.rubric.create({
    data: {
      name,
      teacherId: req.user!.id,
      criteria: criteria?.length ? {
        create: criteria.map((c: any, i: number) => ({
          name: c.name,
          description: c.description ?? null,
          maxPoints: Number(c.maxPoints),
          order: i,
        })),
      } : undefined,
    },
    include: { criteria: { orderBy: { order: 'asc' } } },
  })
  res.status(201).json(rubric)
}

export async function updateRubric(req: AuthRequest, res: Response) {
  const rubric = await prisma.rubric.findUnique({ where: { id: req.params.id } })
  if (!rubric || rubric.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const { name, criteria } = req.body
  // Delete existing criteria and recreate
  await prisma.rubricCriteria.deleteMany({ where: { rubricId: req.params.id } })
  const updated = await prisma.rubric.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      criteria: criteria?.length ? {
        create: criteria.map((c: any, i: number) => ({
          name: c.name,
          description: c.description ?? null,
          maxPoints: Number(c.maxPoints),
          order: i,
        })),
      } : undefined,
    },
    include: { criteria: { orderBy: { order: 'asc' } } },
  })
  res.json(updated)
}

export async function deleteRubric(req: AuthRequest, res: Response) {
  const rubric = await prisma.rubric.findUnique({ where: { id: req.params.id } })
  if (!rubric || rubric.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  await prisma.rubric.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import type { AuthRequest } from '../middleware/auth.js'

async function audit(adminId: string, action: string, target?: string, details?: object) {
  await prisma.auditLog.create({ data: { adminId, action, target, details } })
}

export async function listClassrooms(req: AuthRequest, res: Response) {
  const { search, archived } = req.query as Record<string, string>
  const where: any = {}
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { classCode: { contains: search, mode: 'insensitive' } }]
  if (archived === 'true') where.archived = true
  else if (archived === 'false') where.archived = false

  const classrooms = await prisma.classroom.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      _count: { select: { enrollments: true, assignments: true } },
    },
  })
  res.json(classrooms)
}

export async function getClassroomStudents(req: AuthRequest, res: Response) {
  const { id } = req.params
  const enrollments = await prisma.enrollment.findMany({
    where: { classroomId: id },
    include: { student: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
    orderBy: { joinedAt: 'asc' },
  })
  res.json(enrollments.map(e => ({ ...e.student, joinedAt: e.joinedAt })))
}

export async function toggleArchive(req: AuthRequest, res: Response) {
  const { id } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id } })
  if (!classroom) { res.status(404).json({ error: 'Classroom not found' }); return }
  const updated = await prisma.classroom.update({ where: { id }, data: { archived: !classroom.archived } })
  await audit(req.user!.id, 'CLASSROOM_ARCHIVED', classroom.name, { archived: updated.archived })
  res.json(updated)
}

export async function deleteClassroom(req: AuthRequest, res: Response) {
  const { id } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id } })
  if (!classroom) { res.status(404).json({ error: 'Classroom not found' }); return }
  await prisma.classroom.delete({ where: { id } })
  await audit(req.user!.id, 'CLASSROOM_DELETED', classroom.name)
  res.json({ success: true })
}

export async function removeStudent(req: AuthRequest, res: Response) {
  const { id, studentId } = req.params
  await prisma.enrollment.delete({ where: { studentId_classroomId: { studentId, classroomId: id } } })
  await audit(req.user!.id, 'STUDENT_REMOVED', `studentId:${studentId}`, { classroomId: id })
  res.json({ success: true })
}

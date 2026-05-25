import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'
import { createNotification } from './notification.controller.js'

export async function createAssignment(req: AuthRequest, res: Response) {
  const { classroomId, title, instructions, type, dueDate, totalPoints, timeLimit, questions, subject, unitName } = req.body
  if (!classroomId || !title || !type) {
    res.status(400).json({ error: 'classroomId, title, and type are required' }); return
  }
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Not your classroom' }); return
  }
  const assignment = await prisma.assignment.create({
    data: {
      classroomId,
      title,
      instructions: instructions ?? '',
      type,
      dueDate: dueDate ? new Date(dueDate) : null,
      totalPoints: totalPoints ?? 100,
      timeLimit: timeLimit ?? null,
      subject: subject ?? null,
      unitName: unitName ?? null,
      questions: questions?.length ? {
        create: questions.map((q: any) => ({
          text: q.text,
          type: q.type,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer ?? null,
          tags: q.tags ?? [],
          points: q.points ?? 10,
        })),
      } : undefined,
    },
    include: { questions: true },
  })
  res.status(201).json(assignment)
}

export async function getAssignment(req: AuthRequest, res: Response) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: req.params.id },
    include: { questions: true, classroom: true },
  })
  if (!assignment) { res.status(404).json({ error: 'Not found' }); return }
  res.json(assignment)
}

export async function updateAssignment(req: AuthRequest, res: Response) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: req.params.id },
    include: { classroom: true },
  })
  if (!assignment || assignment.classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const { title, instructions, dueDate, totalPoints, status, timeLimit, rubricId } = req.body
  const updated = await prisma.assignment.update({
    where: { id: req.params.id },
    data: {
      ...(title && { title }),
      ...(instructions !== undefined && { instructions }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(totalPoints && { totalPoints }),
      ...(status && { status }),
      ...(timeLimit !== undefined && { timeLimit }),
      ...(rubricId !== undefined && { rubricId: rubricId || null }),
    },
    include: { questions: true },
  })
  res.json(updated)

  // Notify enrolled students when publishing
  if (status === 'PUBLISHED' && assignment.status !== 'PUBLISHED') {
    const enrollments = await prisma.enrollment.findMany({
      where: { classroomId: assignment.classroomId },
      select: { studentId: true },
    })
    await Promise.all(enrollments.map(e =>
      createNotification(
        e.studentId,
        'NEW_ASSIGNMENT',
        `New assignment: ${updated.title}`,
        `A new assignment has been published in ${assignment.classroom.name}.`,
        `/student/assignment/${updated.id}`,
      )
    ))
  }
}

export async function getClassroomAssignments(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const assignments = await prisma.assignment.findMany({
    where: { classroomId },
    include: { _count: { select: { submissions: true, questions: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(assignments)
}

export async function getStudentAssignments(req: AuthRequest, res: Response) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: req.user!.id },
    select: { classroomId: true },
  })
  const classroomIds = enrollments.map(e => e.classroomId)
  const assignments = await prisma.assignment.findMany({
    where: { classroomId: { in: classroomIds }, status: 'PUBLISHED' },
    include: {
      classroom: { select: { name: true } },
      submissions: { where: { studentId: req.user!.id }, select: { id: true, status: true, totalScore: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { dueDate: 'asc' },
  })
  res.json(assignments)
}

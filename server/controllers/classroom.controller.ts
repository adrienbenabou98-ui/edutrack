import { Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'
import { nanoid } from 'nanoid'

export async function createClassroom(req: AuthRequest, res: Response) {
  const { name, yearLevel, classPassword } = req.body
  if (!name) { res.status(400).json({ error: 'Name is required' }); return }
  const classCode = nanoid(6).toUpperCase()
  const classroom = await prisma.classroom.create({
    data: {
      name,
      teacherId: req.user!.id,
      classCode,
      yearLevel: yearLevel ? Number(yearLevel) : null,
      classPassword: classPassword || null,
    },
  })
  res.status(201).json(classroom)
}

export async function updateClassroom(req: AuthRequest, res: Response) {
  const { name, yearLevel, classPassword } = req.body
  const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const updated = await prisma.classroom.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      yearLevel: yearLevel !== undefined ? (yearLevel ? Number(yearLevel) : null) : undefined,
      classPassword: classPassword !== undefined ? (classPassword || null) : undefined,
    },
  })
  res.json(updated)
}

export async function getMyClassrooms(req: AuthRequest, res: Response) {
  if (req.user!.role === 'TEACHER') {
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: req.user!.id },
      include: { _count: { select: { enrollments: true, assignments: true } } },
    })
    res.json(classrooms)
  } else {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      include: {
        classroom: {
          include: { _count: { select: { assignments: true } } },
        },
      },
    })
    res.json(enrollments.map(e => e.classroom))
  }
}

export async function getClassroom(req: AuthRequest, res: Response) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: req.params.id },
    include: {
      enrollments: {
        include: {
          student: {
            select: { id: true, name: true, email: true, username: true, yearLevel: true, teacherCreated: true },
          },
        },
      },
      assignments: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { submissions: true, questions: true } } },
      },
    },
  })
  if (!classroom) { res.status(404).json({ error: 'Classroom not found' }); return }
  res.json(classroom)
}

export async function joinClassroom(req: AuthRequest, res: Response) {
  const { classCode } = req.body
  if (!classCode) { res.status(400).json({ error: 'Class code is required' }); return }
  const classroom = await prisma.classroom.findUnique({ where: { classCode } })
  if (!classroom) { res.status(404).json({ error: 'Invalid class code' }); return }
  const existing = await prisma.enrollment.findUnique({
    where: { studentId_classroomId: { studentId: req.user!.id, classroomId: classroom.id } },
  })
  if (existing) { res.status(409).json({ error: 'Already enrolled' }); return }
  await prisma.enrollment.create({ data: { studentId: req.user!.id, classroomId: classroom.id } })
  res.status(201).json(classroom)
}

export async function createStudent(req: AuthRequest, res: Response) {
  const { name, username, email, password, yearLevel } = req.body
  if (!name) { res.status(400).json({ error: 'Name is required' }); return }

  const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  if (username) {
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) { res.status(409).json({ error: 'Username already taken' }); return }
  }
  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) { res.status(409).json({ error: 'Email already in use' }); return }
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined

  const student = await prisma.user.create({
    data: {
      name,
      role: 'STUDENT',
      teacherCreated: true,
      email: email || null,
      username: username || null,
      passwordHash: passwordHash ?? null,
      yearLevel: yearLevel ? Number(yearLevel) : null,
    },
  })
  await prisma.enrollment.create({ data: { studentId: student.id, classroomId: classroom.id } })

  res.status(201).json({
    id: student.id, name: student.name, email: student.email,
    username: student.username, yearLevel: student.yearLevel, teacherCreated: student.teacherCreated,
  })
}

export async function updateStudent(req: AuthRequest, res: Response) {
  const { name, username, email, yearLevel } = req.body
  const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }

  const student = await prisma.user.update({
    where: { id: req.params.studentId },
    data: {
      ...(name && { name }),
      username: username !== undefined ? (username || null) : undefined,
      email: email !== undefined ? (email || null) : undefined,
      yearLevel: yearLevel !== undefined ? (yearLevel ? Number(yearLevel) : null) : undefined,
    },
  })
  res.json({
    id: student.id, name: student.name, email: student.email,
    username: student.username, yearLevel: student.yearLevel, teacherCreated: student.teacherCreated,
  })
}

export async function removeStudent(req: AuthRequest, res: Response) {
  const classroom = await prisma.classroom.findUnique({ where: { id: req.params.id } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const student = await prisma.user.findUnique({ where: { id: req.params.studentId } })
  if (!student) { res.status(404).json({ error: 'Student not found' }); return }

  if (student.teacherCreated) {
    await prisma.$transaction(async tx => {
      const submissions = await tx.submission.findMany({ where: { studentId: student.id } })
      const subIds = submissions.map(s => s.id)
      await tx.feedback.deleteMany({ where: { submissionId: { in: subIds } } })
      await tx.answer.deleteMany({ where: { submissionId: { in: subIds } } })
      await tx.submission.deleteMany({ where: { studentId: student.id } })
      await tx.lessonUnderstanding.deleteMany({ where: { studentId: student.id } })
      await tx.unitAssessment.deleteMany({ where: { studentId: student.id } })
      await tx.externalGrade.deleteMany({ where: { studentId: student.id } })
      await tx.unitGrade.deleteMany({ where: { studentId: student.id } })
      await tx.studentComment.deleteMany({ where: { studentId: student.id } })
      await tx.enrollment.deleteMany({ where: { studentId: student.id } })
      await tx.user.delete({ where: { id: student.id } })
    })
  } else {
    await prisma.enrollment.delete({
      where: { studentId_classroomId: { studentId: student.id, classroomId: req.params.id } },
    })
  }
  res.json({ ok: true })
}

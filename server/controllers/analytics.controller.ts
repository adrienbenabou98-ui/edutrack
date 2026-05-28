import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { getStudentProgress, getClassroomAnalytics } from '../services/analytics.service.js'
import { generateClassInsight } from '../services/ai.service.js'
import { prisma } from '../prisma/client.js'

export async function studentProgress(req: AuthRequest, res: Response) {
  const studentId = req.user!.role === 'STUDENT' ? req.user!.id : req.params.studentId

  // Teachers may only view progress of students enrolled in their own classrooms
  if (req.user!.role === 'TEACHER') {
    const enrolled = await prisma.enrollment.findFirst({
      where: { studentId, classroom: { teacherId: req.user!.id } },
    })
    if (!enrolled) { res.status(403).json({ error: 'Forbidden' }); return }
  }

  const data = await getStudentProgress(studentId)
  res.json(data)
}

export async function classroomAnalytics(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const data = await getClassroomAnalytics(classroomId)
  res.json(data)
}

export async function classInsight(req: AuthRequest, res: Response) {
  const { classroomId } = req.params
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } })
  if (!classroom || classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const data = await getClassroomAnalytics(classroomId)
  const submissions = data.studentStats
    .filter(s => s.averageScore !== null)
    .map(s => ({ studentName: s.studentName.split(' ')[0], score: s.averageScore!, weakTags: s.weakTags }))

  if (submissions.length === 0) {
    res.json({ insight: 'No submission data yet to generate insights.' }); return
  }
  try {
    const insight = await generateClassInsight({ classroomName: classroom.name, submissions })
    res.json({ insight })
  } catch (err: any) {
    // Surface a clear, safe message to the UI instead of an unhandled 500.
    // Never leak the raw SDK error (it may contain the API key in headers).
    console.error('classInsight failed:', err?.message)
    const isAuth = err?.status === 401 || /api[_-]?key|authentication/i.test(err?.message ?? '')
    res.status(502).json({
      error: isAuth
        ? 'AI service is not configured. Check the ANTHROPIC_API_KEY environment variable.'
        : 'Could not generate insight right now. Please try again in a moment.',
    })
  }
}

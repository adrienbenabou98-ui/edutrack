import { Response } from 'express'
import { prisma } from '../prisma/client.js'
import { AuthRequest } from '../middleware/auth.js'
import { gradeSubmission } from '../services/grading.service.js'
import { generateStudentFeedback } from '../services/ai.service.js'
import { getStudentProgress } from '../services/analytics.service.js'
import { createNotification } from './notification.controller.js'
import { checkPlagiarism } from './plagiarism.controller.js'

export async function submitAssignment(req: AuthRequest, res: Response) {
  const { assignmentId, answers } = req.body
  if (!assignmentId || !answers) {
    res.status(400).json({ error: 'assignmentId and answers are required' }); return
  }
  const existing = await prisma.submission.findFirst({
    where: { assignmentId, studentId: req.user!.id },
  })
  if (existing) { res.status(409).json({ error: 'Already submitted' }); return }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      questions: true,
      rubric: { include: { criteria: { orderBy: { order: 'asc' } } } },
    },
  })
  if (!assignment) { res.status(404).json({ error: 'Assignment not found' }); return }

  const { gradedAnswers, totalScore } = gradeSubmission(assignment.questions, answers)

  const submission = await prisma.submission.create({
    data: {
      assignmentId,
      studentId: req.user!.id,
      totalScore,
      status: 'SUBMITTED',
      answers: {
        create: gradedAnswers.map(a => ({
          questionId: a.questionId,
          responseText: a.responseText,
          isCorrect: a.isCorrect,
          pointsAwarded: a.pointsAwarded,
        })),
      },
    },
    include: { answers: true },
  })

  res.status(201).json(submission)

  // Notify student their assignment was graded (for auto-graded submissions)
  if (totalScore !== null) {
    createNotification(
      req.user!.id,
      'GRADED',
      'Your assignment was graded',
      `Your submission for "${assignment.title}" has been graded.`,
    ).catch(() => {})
  }

  // Fire plagiarism check async (fire and forget)
  checkPlagiarism(submission.id)

  try {
    const student = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } })
    const progress = await getStudentProgress(req.user!.id)
    const weakTags = progress.weakAreas.map(w => w.tag)
    const aiSuggestion = await generateStudentFeedback({
      firstName: student!.name.split(' ')[0],
      assignmentTitle: assignment.title,
      score: totalScore,
      totalPoints: assignment.totalPoints,
      weakTags,
      trend: progress.trend,
      rubricCriteria: (assignment as any).rubric?.criteria ?? undefined,
    })
    await prisma.feedback.upsert({
      where: { submissionId: submission.id },
      create: { submissionId: submission.id, aiSuggestion },
      update: { aiSuggestion },
    })
  } catch (err) {
    console.error('AI feedback generation failed:', err)
  }
}

export async function getSubmission(req: AuthRequest, res: Response) {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { answers: { include: { question: true } }, feedback: true },
  })
  if (!submission) { res.status(404).json({ error: 'Not found' }); return }
  if (req.user!.role === 'STUDENT' && submission.studentId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  res.json(submission)
}

export async function getAssignmentSubmissions(req: AuthRequest, res: Response) {
  const { assignmentId } = req.params
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { classroom: true },
  })
  if (!assignment || assignment.classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    include: { student: { select: { id: true, name: true, email: true } }, feedback: true },
    orderBy: { submittedAt: 'desc' },
  })
  res.json(submissions)
}

export async function getMySubmissions(req: AuthRequest, res: Response) {
  const submissions = await prisma.submission.findMany({
    where: { studentId: req.user!.id },
    include: { assignment: { select: { title: true, totalPoints: true } }, feedback: true },
    orderBy: { submittedAt: 'desc' },
  })
  res.json(submissions)
}

export async function dismissPlagiarism(req: AuthRequest, res: Response) {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { assignment: { include: { classroom: true } } },
  })
  if (!submission) { res.status(404).json({ error: 'Not found' }); return }
  if (req.user!.role === 'TEACHER' && submission.assignment.classroom.teacherId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  await prisma.submission.update({
    where: { id: req.params.id },
    data: { plagiarismFlag: false, plagiarismReport: null },
  })
  res.json({ ok: true })
}

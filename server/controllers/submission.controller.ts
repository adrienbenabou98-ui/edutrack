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

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      questions: true,
      rubric: { include: { criteria: { orderBy: { order: 'asc' } } } },
      classroom: { select: { teacherId: true } },
    },
  })
  if (!assignment) { res.status(404).json({ error: 'Assignment not found' }); return }

  // A student may have a previous submission. Decide whether this is a first
  // submission or an allowed resubmission.
  const existing = await prisma.submission.findFirst({
    where: { assignmentId, studentId: req.user!.id },
  })
  const isResubmission = !!existing
  if (existing) {
    if (!assignment.resubmissionsAllowed) {
      res.status(409).json({ error: 'Resubmissions are not allowed for this assignment.' }); return
    }
    if (existing.resubmissionCount >= assignment.maxResubmissions) {
      res.status(409).json({
        error: `You have reached the maximum of ${assignment.maxResubmissions} resubmission(s).`,
      }); return
    }
  }

  const { gradedAnswers, totalScore } = gradeSubmission(assignment.questions, answers)

  let submission
  if (existing) {
    // Replace the prior answers and bump the resubmission counter.
    await prisma.answer.deleteMany({ where: { submissionId: existing.id } })
    submission = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        totalScore,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        resubmissionCount: existing.resubmissionCount + 1,
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
  } else {
    submission = await prisma.submission.create({
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
  }

  res.status(201).json(submission)

  // Notify the teacher that a student submitted (or resubmitted).
  if (assignment.classroom?.teacherId) {
    const student = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } })
    createNotification(
      assignment.classroom.teacherId,
      'SUBMISSION',
      isResubmission ? 'A student resubmitted work' : 'New submission received',
      `${student?.name ?? 'A student'} ${isResubmission ? 'resubmitted' : 'submitted'} "${assignment.title}".`,
      `/teacher/submission/${submission.id}`,
    ).catch(() => {})
  }

  // Notify student their assignment was graded (for auto-graded submissions)
  if (totalScore !== null) {
    createNotification(
      req.user!.id,
      'GRADED',
      'Your assignment was graded',
      `Your submission for "${assignment.title}" has been graded.`,
      `/student/submission/${submission.id}`,
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
    // Log message only — Anthropic SDK errors include Authorization header (API key)
    console.error('AI feedback generation failed:', (err as any)?.message ?? String(err))
  }
}

export async function getSubmission(req: AuthRequest, res: Response) {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: {
      answers: { include: { question: true } },
      feedback: true,
      student: { select: { id: true, name: true, email: true } },
      assignment: { include: { classroom: { select: { teacherId: true } } } },
    },
  })
  if (!submission) { res.status(404).json({ error: 'Not found' }); return }
  // Students may only read their own submission.
  if (req.user!.role === 'STUDENT' && submission.studentId !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  // Teachers may only read submissions in their own classrooms.
  if (req.user!.role === 'TEACHER' && submission.assignment.classroom.teacherId !== req.user!.id) {
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

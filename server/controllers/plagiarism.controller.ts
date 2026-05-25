import { prisma } from '../prisma/client.js'
import Anthropic from '@anthropic-ai/sdk'
import { createNotification } from './notification.controller.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function checkPlagiarism(submissionId: string) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: { include: { question: true } },
        assignment: {
          include: {
            questions: true,
            classroom: { include: { teacher: { select: { id: true } } } },
          },
        },
        student: { select: { name: true } },
      },
    })
    if (!submission) return

    // Only run on assignments that have at least one long-answer question
    const hasLongAnswer = submission.assignment.questions.some(q => q.type === 'LONG_ANSWER')
    if (!hasLongAnswer) return

    const newLongAnswers = submission.answers
      .filter(a => a.question.type === 'LONG_ANSWER' && a.responseText)
      .map(a => a.responseText!)
    if (newLongAnswers.length === 0) return

    // Fetch all other submissions for this assignment
    const otherSubmissions = await prisma.submission.findMany({
      where: { assignmentId: submission.assignmentId, id: { not: submissionId } },
      include: {
        answers: { include: { question: true } },
        student: { select: { name: true } },
      },
    })

    if (otherSubmissions.length === 0) return

    const otherTexts = otherSubmissions
      .map(s => {
        const longAnswers = s.answers
          .filter(a => a.question.type === 'LONG_ANSWER' && a.responseText)
          .map(a => a.responseText!)
        return { studentName: s.student.name, studentId: s.studentId, text: longAnswers.join('\n') }
      })
      .filter(s => s.text.length > 0)

    if (otherTexts.length === 0) return

    const prompt = `You are an academic integrity checker. Compare the following student submission against other submissions for the same assignment.

New submission:
${newLongAnswers.join('\n')}

Other submissions:
${otherTexts.map((s, i) => `[${i + 1}] ${s.studentName}:\n${s.text}`).join('\n\n')}

Determine if the new submission is suspiciously similar to any other submission (copy-paste, paraphrasing, identical structure).
Respond with ONLY valid JSON in this exact format:
{"flagged": boolean, "reason": "brief explanation", "similarTo": ["student name if similar, else empty array"]}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = (message.content[0] as { type: string; text: string }).text
    const result = JSON.parse(responseText) as { flagged: boolean; reason: string; similarTo: string[] }

    if (result.flagged) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { plagiarismFlag: true, plagiarismReport: result.reason },
      })
      // Notify the teacher
      const teacherId = submission.assignment.classroom.teacher.id
      await createNotification(
        teacherId,
        'PLAGIARISM',
        'Possible plagiarism detected',
        `Possible plagiarism detected on "${submission.assignment.title}" — ${submission.student.name}`,
      )
    }
  } catch (err) {
    console.error('Plagiarism check failed:', err)
  }
}

export async function dismissPlagiarismFlag(submissionId: string) {
  await prisma.submission.update({
    where: { id: submissionId },
    data: { plagiarismFlag: false, plagiarismReport: null },
  })
}

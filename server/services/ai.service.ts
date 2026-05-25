import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface StudentFeedbackInput {
  firstName: string
  assignmentTitle: string
  score: number
  totalPoints: number
  weakTags: string[]
  trend: 'improving' | 'steady' | 'declining'
  rubricCriteria?: { name: string; description?: string | null; maxPoints: number }[]
}

export async function generateStudentFeedback(input: StudentFeedbackInput): Promise<string> {
  const { firstName, assignmentTitle, score, totalPoints, weakTags, trend, rubricCriteria } = input
  const rubricSection = rubricCriteria?.length
    ? `\nRubric criteria:\n${rubricCriteria.map(c => `- ${c.name} (${c.maxPoints} pts)${c.description ? ': ' + c.description : ''}`).join('\n')}`
    : ''
  const prompt = `You are a supportive teacher giving feedback to a student.

Student: ${firstName}
Assignment: ${assignmentTitle}
Score: ${score}% (out of ${totalPoints} points)
Trend: ${trend}
Weak areas: ${weakTags.length > 0 ? weakTags.join(', ') : 'none identified'}${rubricSection}

Write 2-3 sentences of personalised encouragement and one specific improvement tip based on their weak areas${rubricCriteria?.length ? ' and rubric criteria' : ''}. Be warm, specific, and actionable. Do not use the student's last name. Do not mention their score directly.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  return (message.content[0] as { type: string; text: string }).text
}

interface ClassInsightInput {
  classroomName: string
  submissions: { studentName: string; score: number; weakTags: string[] }[]
}

export async function generateClassInsight(input: ClassInsightInput): Promise<string> {
  const { classroomName, submissions } = input
  const summaries = submissions
    .map(s => `${s.studentName}: ${s.score.toFixed(0)}%, weak areas: ${s.weakTags.join(', ') || 'none'}`)
    .join('\n')

  const prompt = `You are helping a teacher understand their class performance.

Class: ${classroomName}
Recent submission data:
${summaries}

Provide a 3-4 sentence summary for the teacher covering:
1. Overall class performance
2. The most common misconceptions or weak areas
3. Which students may need the most support (use first names only)

Be concise and actionable.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  return (message.content[0] as { type: string; text: string }).text
}

export async function answerTeacherQuery(query: string, classContext: string): Promise<string> {
  const prompt = `You are an AI assistant helping a teacher analyse student performance.

Class context:
${classContext}

Teacher's question: ${query}

Answer concisely and helpfully based only on the provided data.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  return (message.content[0] as { type: string; text: string }).text
}

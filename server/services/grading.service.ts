import { QuestionType } from '@prisma/client'

interface Question {
  id: string
  type: QuestionType
  correctAnswer: string | null
  points: number
}

interface AnswerInput {
  questionId: string
  responseText: string
}

export function gradeSubmission(questions: Question[], answers: AnswerInput[]) {
  const answerMap = new Map(answers.map(a => [a.questionId, a.responseText]))
  let totalEarned = 0
  let totalPossible = 0

  const gradedAnswers = questions.map(q => {
    totalPossible += q.points
    const response = answerMap.get(q.id) ?? ''
    let isCorrect: boolean | null = null
    let pointsAwarded = 0

    if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
      isCorrect = q.correctAnswer !== null &&
        response.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
      pointsAwarded = isCorrect ? q.points : 0
      totalEarned += pointsAwarded
    }

    return { questionId: q.id, responseText: response, isCorrect, pointsAwarded }
  })

  const percentScore = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0

  return { gradedAnswers, totalScore: Math.round(percentScore * 10) / 10 }
}

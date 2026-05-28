import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

interface Answer {
  id: string
  responseText: string | null
  isCorrect: boolean | null
  pointsAwarded: number | null
  question: { id: string; text: string; type: string; points: number; correctAnswer: string | null }
}
interface Submission {
  id: string
  totalScore: number | null
  status: string
  resubmissionCount: number
  submittedAt: string
  student?: { id: string; name: string; email: string }
  assignment: { title: string; totalPoints: number }
  answers: Answer[]
  feedback?: { aiSuggestion: string } | null
}

export default function SubmissionDetail({ role }: { role: 'STUDENT' | 'TEACHER' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/submissions/${id}`)
      .then(r => setSubmission(r.data))
      .catch(err => setError(err?.response?.data?.error ?? 'Could not load this submission.'))
  }, [id])

  const backTo = role === 'TEACHER' ? '/teacher' : '/student'

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error}</p>
        <button onClick={() => navigate(backTo)} className="text-sm text-indigo-600 hover:text-indigo-700">← Dashboard</button>
      </div>
    )
  }
  if (!submission) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(backTo)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <span className="text-lg font-semibold text-gray-900">{submission.assignment.title}</span>
      </nav>
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            {role === 'TEACHER' && submission.student && (
              <p className="font-medium text-gray-900">{submission.student.name}</p>
            )}
            <p className="text-sm text-gray-400">
              Submitted {new Date(submission.submittedAt).toLocaleString()}
              {submission.resubmissionCount > 0 && ` · resubmission #${submission.resubmissionCount}`}
            </p>
          </div>
          {submission.totalScore !== null && (
            <div className={`text-3xl font-bold ${submission.totalScore >= 70 ? 'text-teal-600' : 'text-orange-500'}`}>
              {submission.totalScore.toFixed(0)}%
            </div>
          )}
        </div>

        {submission.feedback?.aiSuggestion && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide bg-indigo-100 px-2 py-0.5 rounded">AI Feedback</span>
            <p className="text-sm text-indigo-900 leading-relaxed mt-2">{submission.feedback.aiSuggestion}</p>
          </div>
        )}

        <div className="space-y-4">
          {submission.answers.map((a, i) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="font-medium text-gray-900 mb-2">
                <span className="text-gray-400 text-sm mr-2">Q{i + 1}</span>{a.question.text}
              </p>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-800">
                {a.responseText || <span className="text-gray-400 italic">No answer</span>}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                {a.isCorrect !== null ? (
                  <span className={a.isCorrect ? 'text-teal-600 font-medium' : 'text-orange-600 font-medium'}>
                    {a.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                ) : <span className="text-gray-400">Manually graded</span>}
                <span className="text-gray-400">
                  {a.pointsAwarded ?? 0} / {a.question.points} pts
                </span>
              </div>
              {role === 'TEACHER' && !a.isCorrect && a.question.correctAnswer && (
                <p className="text-xs text-gray-400 mt-2">Expected: {a.question.correctAnswer}</p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

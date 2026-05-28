import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'

interface Question {
  id: string; text: string; type: string; options: string[] | null; points: number
}
interface PriorSubmission {
  id: string; status: string; totalScore: number | null; resubmissionCount: number
}
interface Assignment {
  id: string; title: string; instructions: string; type: string
  resubmissionsAllowed: boolean; maxResubmissions: number
  questions: Question[]
  submissions: PriorSubmission[]
}

export default function TakeAssignment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ totalScore: number } | null>(null)
  const [resubmitMode, setResubmitMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/assignments/${id}`).then(r => setAssignment(r.data))
  }, [id])

  function setAnswer(questionId: string, value: string) {
    setAnswers(a => ({ ...a, [questionId]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        assignmentId: id,
        answers: Object.entries(answers).map(([questionId, responseText]) => ({ questionId, responseText })),
      }
      const { data } = await api.post('/submissions', payload)
      setResult({ totalScore: data.totalScore })
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!assignment) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  const prior = assignment.submissions?.[0]
  const resubmitsLeft = assignment.maxResubmissions - (prior?.resubmissionCount ?? 0)
  const canResubmit = assignment.resubmissionsAllowed && resubmitsLeft > 0

  // Student has already submitted and is not currently resubmitting — show their
  // submitted work with options to view it or (if allowed) resubmit.
  if (prior && !resubmitMode && !result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/student')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <span className="text-lg font-semibold text-gray-900">{assignment.title}</span>
        </nav>
        <main className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <p className="text-gray-600 mb-2">You have already submitted this assignment.</p>
            {prior.totalScore !== null && (
              <div className={`text-5xl font-bold my-3 ${prior.totalScore >= 70 ? 'text-teal-600' : 'text-orange-500'}`}>
                {prior.totalScore.toFixed(0)}%
              </div>
            )}
            {assignment.resubmissionsAllowed && (
              <p className="text-sm text-gray-400 mb-6">
                Resubmissions used: {prior.resubmissionCount} of {assignment.maxResubmissions}
              </p>
            )}
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button onClick={() => navigate(`/student/submission/${prior.id}`)}
                className="btn-3d-teal px-6">
                View my submission
              </button>
              {canResubmit ? (
                <button onClick={() => { setResubmitMode(true); setAnswers({}); setError(null) }}
                  className="px-6 py-2 border border-teal-300 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-50">
                  Resubmit ({resubmitsLeft} left)
                </button>
              ) : assignment.resubmissionsAllowed ? (
                <p className="text-xs text-gray-400">No resubmissions remaining.</p>
              ) : null}
              <button onClick={() => navigate('/student')}
                className="text-sm text-gray-500 hover:text-gray-700">Back to Dashboard</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center">
          <div className={`text-5xl font-bold mb-2 ${result.totalScore >= 70 ? 'text-teal-600' : 'text-orange-500'}`}>
            {result.totalScore.toFixed(0)}%
          </div>
          <p className="text-gray-600 mb-2">Assignment submitted!</p>
          <p className="text-gray-400 text-sm mb-6">
            {result.totalScore >= 90 ? 'Excellent work!' : result.totalScore >= 70 ? 'Good job!' : 'Keep practising — you\'ll get there!'}
          </p>
          <button onClick={() => navigate('/student')}
            className="btn-3d-teal px-6">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/student')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <span className="text-lg font-semibold text-gray-900">{assignment.title}</span>
      </nav>
      <form onSubmit={handleSubmit}>
        <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          {assignment.instructions && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
              {assignment.instructions}
            </div>
          )}
          {assignment.questions.map((q, i) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="font-medium text-gray-900 mb-4">
                <span className="text-gray-400 text-sm mr-2">Q{i + 1}</span>{q.text}
              </p>
              {q.type === 'MULTIPLE_CHOICE' && q.options && (
                <div className="space-y-2">
                  {q.options.map(o => (
                    <label key={o} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50">
                      <input type="radio" name={q.id} value={o} onChange={() => setAnswer(q.id, o)} required />
                      <span className="text-sm text-gray-800">{o}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'TRUE_FALSE' && (
                <div className="flex gap-4">
                  {['True', 'False'].map(v => (
                    <label key={v} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50">
                      <input type="radio" name={q.id} value={v} onChange={() => setAnswer(q.id, v)} required />
                      <span className="text-sm font-medium">{v}</span>
                    </label>
                  ))}
                </div>
              )}
              {(q.type === 'SHORT_ANSWER') && (
                <input value={answers[q.id] ?? ''} onChange={e => setAnswer(q.id, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Your answer…" required />
              )}
              {q.type === 'LONG_ANSWER' && (
                <textarea value={answers[q.id] ?? ''} onChange={e => setAnswer(q.id, e.target.value)} rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Your answer…" required />
              )}
              <p className="text-xs text-gray-400 mt-3 text-right">{q.points} pts</p>
            </div>
          ))}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
          )}
          <div className="flex justify-end pb-8">
            <button type="submit" disabled={submitting}
              className="btn-3d-teal px-6 py-2.5 disabled:opacity-50">
              {submitting ? 'Submitting…' : resubmitMode ? 'Resubmit Assignment' : 'Submit Assignment'}
            </button>
          </div>
        </main>
      </form>
    </div>
  )
}

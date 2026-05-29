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
  student?: { id: string; name: string }
  assignment: { title: string; totalPoints: number }
  answers: Answer[]
  feedback?: { aiSuggestion: string | null; teacherNote: string | null } | null
}

export default function SubmissionDetail({ role }: { role: 'STUDENT' | 'TEACHER' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editedPoints, setEditedPoints] = useState<Record<string, number>>({})
  const [teacherNote, setTeacherNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/submissions/${id}`)
      .then(r => {
        setSubmission(r.data)
        if (role === 'TEACHER') {
          const pts: Record<string, number> = {}
          r.data.answers.forEach((a: Answer) => {
            if (a.pointsAwarded !== null) pts[a.id] = a.pointsAwarded
          })
          setEditedPoints(pts)
          setTeacherNote(r.data.feedback?.teacherNote ?? '')
        }
      })
      .catch(err => setError(err?.response?.data?.error ?? 'Could not load this submission.'))
  }, [id])

  const backTo = role === 'TEACHER' ? '/teacher' : '/student'

  async function saveGrade() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const grades = submission!.answers
        .filter(a => a.isCorrect === null)
        .map(a => ({ answerId: a.id, pointsAwarded: editedPoints[a.id] ?? 0 }))
      const res = await api.put(`/submissions/${id}/grade`, { grades, teacherNote })
      setSaveMsg(`Saved — Score: ${res.data.totalScore.toFixed(0)}%`)
      const updated = await api.get(`/submissions/${id}`)
      setSubmission(updated.data)
    } catch {
      setSaveMsg('Failed to save — please try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 4000)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error}</p>
        <button onClick={() => navigate(backTo)} className="text-sm text-indigo-600 hover:text-indigo-700">← Dashboard</button>
      </div>
    )
  }
  if (!submission) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  const hasManualQuestions = submission.answers.some(a => a.isCorrect === null)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(backTo)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← Back</button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white">{submission.assignment.title}</span>
        {role === 'TEACHER' && hasManualQuestions && submission.status !== 'GRADED' && (
          <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-medium">Needs grading</span>
        )}
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            {role === 'TEACHER' && submission.student && (
              <p className="font-medium text-gray-900 dark:text-white">{submission.student.name}</p>
            )}
            <p className="text-sm text-gray-400 dark:text-gray-500">
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

        {/* AI feedback */}
        {submission.feedback?.aiSuggestion && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide bg-indigo-100 px-2 py-0.5 rounded">AI Feedback</span>
            <p className="text-sm text-indigo-900 leading-relaxed mt-2">{submission.feedback.aiSuggestion}</p>
          </div>
        )}

        {/* Teacher note (visible to student) */}
        {role === 'STUDENT' && submission.feedback?.teacherNote && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide bg-teal-100 px-2 py-0.5 rounded">Teacher Note</span>
            <p className="text-sm text-teal-900 leading-relaxed mt-2">{submission.feedback.teacherNote}</p>
          </div>
        )}

        {/* Answers */}
        <div className="space-y-4">
          {submission.answers.map((a, i) => (
            <div key={a.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <p className="font-medium text-gray-900 dark:text-white mb-2">
                <span className="text-gray-400 dark:text-gray-500 text-sm mr-2">Q{i + 1}</span>{a.question.text}
              </p>
              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-lg p-3 text-sm text-gray-800 dark:text-gray-200 break-all">
                {a.responseText || <span className="text-gray-400 italic">No answer</span>}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                {a.isCorrect !== null ? (
                  <span className={a.isCorrect ? 'text-teal-600 font-medium' : 'text-orange-600 font-medium'}>
                    {a.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 italic">{role === 'TEACHER' ? 'Set points →' : 'Manually graded'}</span>
                )}
                <div className="flex items-center gap-2">
                  {role === 'TEACHER' && a.isCorrect === null ? (
                    <input
                      type="number"
                      min={0}
                      max={a.question.points}
                      value={editedPoints[a.id] ?? 0}
                      onChange={e => setEditedPoints(p => ({
                        ...p,
                        [a.id]: Math.min(a.question.points, Math.max(0, Number(e.target.value))),
                      }))}
                      className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">{a.pointsAwarded ?? 0}</span>
                  )}
                  <span className="text-gray-400 dark:text-gray-500">/ {a.question.points} pts</span>
                </div>
              </div>
              {role === 'TEACHER' && !a.isCorrect && a.question.correctAnswer && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Expected: {a.question.correctAnswer}</p>
              )}
            </div>
          ))}
        </div>

        {/* Teacher grading panel */}
        {role === 'TEACHER' && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Grading</h3>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Note for student <span className="text-gray-400 font-normal">(optional — shown on their submission view)</span>
              </label>
              <textarea
                value={teacherNote}
                onChange={e => setTeacherNote(e.target.value)}
                rows={3}
                placeholder="Add feedback or a comment…"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-between">
              {saveMsg ? (
                <span className={`text-sm font-medium ${saveMsg.startsWith('Saved') ? 'text-teal-600' : 'text-red-500'}`}>
                  {saveMsg}
                </span>
              ) : <span />}
              <button onClick={saveGrade} disabled={saving} className="btn-3d-indigo px-5 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Grade'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

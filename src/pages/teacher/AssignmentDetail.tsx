import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api/client'

interface Submission {
  id: string
  totalScore: number | null
  status: string
  submittedAt: string
  resubmissionCount: number
  student: { id: string; name: string; email: string }
  feedback: { aiSuggestion: string } | null
}

interface Question {
  id: string
  text: string
  type: string
  points: number
}

interface Assignment {
  id: string
  title: string
  instructions: string | null
  type: string
  status: string
  dueDate: string | null
  totalPoints: number
  resubmissionsAllowed: boolean
  maxResubmissions: number
  questions: Question[]
  _count: { submissions: number }
}

export default function AssignmentDetail() {
  const { classroomId, assignmentId } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get(`/assignments/${assignmentId}`),
      api.get(`/submissions/assignment/${assignmentId}`),
    ])
      .then(([aRes, sRes]) => {
        setAssignment(aRes.data)
        setSubmissions(sRes.data)
      })
      .catch(err => setError(err?.response?.data?.error ?? 'Could not load assignment.'))
      .finally(() => setLoading(false))
  }, [assignmentId])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500">{error}</p>
      <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:text-indigo-700">← Go back</button>
    </div>
  )
  if (!assignment) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(`/teacher/classroom/${classroomId}`)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">← Back to classroom</button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white">{assignment.title}</span>
        <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
          assignment.status === 'PUBLISHED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}>{assignment.status}</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Details */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-3">
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{assignment.type}</span>
            <span>{assignment.questions.length} question{assignment.questions.length !== 1 ? 's' : ''}</span>
            <span>{assignment.totalPoints} pts total</span>
            {assignment.dueDate && <span>Due {new Date(assignment.dueDate).toLocaleString()}</span>}
            {assignment.resubmissionsAllowed && (
              <span className="text-indigo-600 dark:text-indigo-400">Resubmissions: up to {assignment.maxResubmissions}</span>
            )}
          </div>
          {assignment.instructions && (
            <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">{assignment.instructions}</p>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Questions</h2>
          {assignment.questions.map((q, i) => (
            <div key={q.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Q{i + 1} · {q.type.replace('_', ' ')} · {q.points} pts</p>
              <p className="text-gray-900 dark:text-white">{q.text}</p>
            </div>
          ))}
        </div>

        {/* Submissions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Submissions ({submissions.length})</h2>
          </div>
          {submissions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 dark:text-gray-500 text-sm">
              No submissions yet
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {submissions.map(s => (
                <Link key={s.id} to={`/teacher/submission/${s.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                    {s.student.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{s.student.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.submittedAt).toLocaleString()}
                      {s.resubmissionCount > 0 && ` · resubmission #${s.resubmissionCount}`}
                    </p>
                  </div>
                  {s.totalScore !== null ? (
                    <span className={`text-lg font-bold ${s.totalScore >= 70 ? 'text-teal-600' : 'text-orange-500'}`}>
                      {s.totalScore.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Ungraded</span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

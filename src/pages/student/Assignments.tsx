import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentNav from '../../components/StudentNav'
import api from '../../api/client'

interface Assignment {
  id: string; title: string; type: string; dueDate: string | null
  classroom: { name: string }
  submissions: { id: string; status: string; totalScore: number | null }[]
  _count: { questions: number }
}

function statusBadge(subs: Assignment['submissions']) {
  if (subs.length === 0) return { label: 'Not Started', color: 'bg-gray-100 text-gray-500' }
  if (subs[0].status === 'GRADED') return { label: `Graded · ${subs[0].totalScore?.toFixed(0)}%`, color: 'bg-green-100 text-green-700' }
  return { label: 'Submitted', color: 'bg-blue-100 text-blue-700' }
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/assignments/my').then(r => { setAssignments(r.data); setLoading(false) })
  }, [])

  const due = assignments.filter(a => a.submissions.length === 0)
  const done = assignments.filter(a => a.submissions.length > 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentNav activePage="assignments" />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Assignments</h1>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-400 text-lg">No assignments yet</p>
            <p className="text-gray-400 text-sm mt-1">Your teacher will assign work once you join a class</p>
          </div>
        ) : (
          <div className="space-y-6">
            {due.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">To Do</h2>
                <div className="space-y-3">
                  {due.map(a => {
                    const badge = statusBadge(a.submissions)
                    return (
                      <Link key={a.id} to={`/student/assignment/${a.id}`}
                        className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 hover:border-teal-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{a.title}</h3>
                            <p className="text-sm text-gray-400 mt-0.5">{a.classroom.name} · {a._count.questions} questions</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
                        </div>
                        {a.dueDate && (
                          <p className="text-xs text-gray-400 mt-2">Due {new Date(a.dueDate).toLocaleDateString()}</p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Completed</h2>
                <div className="space-y-3">
                  {done.map(a => {
                    const badge = statusBadge(a.submissions)
                    return (
                      <div key={a.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 opacity-75">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{a.title}</h3>
                            <p className="text-sm text-gray-400 mt-0.5">{a.classroom.name}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

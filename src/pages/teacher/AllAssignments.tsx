import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TeacherNav from '../../components/TeacherNav'
import api from '../../api/client'

interface Assignment {
  id: string; title: string; type: string; dueDate: string | null
  classroom: { id: string; name: string }
  _count: { questions: number; submissions: number }
}

const TYPE_LABEL: Record<string, string> = {
  ASSIGNMENT: 'Assignment', QUIZ: 'Quiz', EXAM: 'Exam',
}


export default function TeacherAllAssignments() {
  const navigate = useNavigate()
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/classrooms'),
      api.get('/assignments/all'),
    ]).then(([cr, ar]) => {
      setClassrooms(cr.data)
      setAssignments(ar.data)
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.classroom.id === filter)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TeacherNav activePage="assignments" />


      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Assignments</h1>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All classes</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loadingâ€¦</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-400">No assignments yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => (
              <button
                key={a.id}
                onClick={() => navigate(`/teacher/classroom/${a.classroom.id}`)}
                className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{a.title}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{a.classroom.name} Â· {a._count.questions} questions</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
                      {TYPE_LABEL[a.type] ?? a.type}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{a._count.submissions} submitted</span>
                    {a.dueDate && (
                      <span className="text-xs text-gray-400">Due {new Date(a.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

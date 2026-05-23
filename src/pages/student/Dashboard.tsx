import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import DarkModeToggle from '../../components/DarkModeToggle'
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

export default function StudentDashboard() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [showJoin, setShowJoin] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/assignments/my').then(r => { setAssignments(r.data); setLoading(false) })
  }, [])

  async function joinClass(e: React.FormEvent) {
    e.preventDefault()
    setJoinError('')
    try {
      await api.post('/classrooms/join', { classCode })
      setShowJoin(false)
      setClassCode('')
      const r = await api.get('/assignments/my')
      setAssignments(r.data)
    } catch (err: any) {
      setJoinError(err.response?.data?.error ?? 'Failed to join')
    }
  }

  const due = assignments.filter(a => a.submissions.length === 0)
  const done = assignments.filter(a => a.submissions.length > 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-semibold text-teal-700">EduTrack</span>
        <div className="flex items-center gap-4">
          <a href="/student/progress" className="text-sm text-teal-600 font-medium hover:text-teal-700">My Progress</a>
          <a href="/messages" className="text-sm text-teal-600 font-medium hover:text-teal-700">Messages</a>
          <button onClick={() => setShowJoin(true)} className="text-sm text-teal-600 font-medium hover:text-teal-700">Join Class</button>
          <DarkModeToggle />
          <span className="text-sm text-gray-600 dark:text-gray-300">{user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Hi, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">
            {due.length === 0 ? 'You\'re all caught up!' : `You have ${due.length} task${due.length > 1 ? 's' : ''} to complete`}
          </p>
        </div>

        {showJoin && (
          <form onSubmit={joinClass} className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Enter your class code</p>
            <div className="flex gap-3">
              <input autoFocus value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="ABC123" maxLength={6} required />
              <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Join</button>
              <button type="button" onClick={() => setShowJoin(false)} className="text-gray-500 px-3 text-sm">Cancel</button>
            </div>
            {joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
          </form>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-lg">No assignments yet</p>
            <p className="text-gray-400 text-sm mt-1">Join a class using a class code from your teacher</p>
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
                        className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-teal-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{a.title}</h3>
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
                      <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 opacity-75">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{a.title}</h3>
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

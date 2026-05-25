import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import DarkModeToggle from '../../components/DarkModeToggle'
import NotificationBell from '../../components/NotificationBell'
import api from '../../api/client'

const NAV_ICON_CLS = "flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"

interface Assignment {
  id: string; title: string; type: string; dueDate: string | null
  classroom: { name: string }
  submissions: { id: string; status: string; totalScore: number | null }[]
  _count: { questions: number }
}

interface Classroom {
  id: string; name: string; classCode: string; yearLevel: number | null
  _count: { assignments: number }
}

interface GradeGoal {
  id: string; classroomId: string; targetGrade: number
  classroom: { name: string }
}

interface LeaderboardEntry {
  studentId: string; name: string; points: number; rank: number; isCurrentUser: boolean
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
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [gradeGoals, setGradeGoals] = useState<GradeGoal[]>([])
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({})
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [goalValue, setGoalValue] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const [assignRes, classRes, goalRes] = await Promise.all([
      api.get('/assignments/my'),
      api.get('/classrooms'),
      api.get('/grade-goals'),
    ])
    setAssignments(assignRes.data)
    setClassrooms(classRes.data)
    setGradeGoals(goalRes.data)
    setLoading(false)
    // Load leaderboards for each classroom
    for (const c of classRes.data) {
      api.get(`/classrooms/${c.id}/leaderboard`).then(r => {
        setLeaderboards(prev => ({ ...prev, [c.id]: r.data }))
      }).catch(() => {})
    }
  }

  useEffect(() => { loadAll() }, [])

  async function saveGoal(classroomId: string) {
    const val = parseFloat(goalValue)
    if (isNaN(val) || val < 0 || val > 100) return
    const { data } = await api.put(`/grade-goals/${classroomId}`, { targetGrade: val })
    setGradeGoals(gs => {
      const existing = gs.find(g => g.classroomId === classroomId)
      if (existing) return gs.map(g => g.classroomId === classroomId ? { ...g, targetGrade: data.targetGrade } : g)
      return [...gs, data]
    })
    setEditingGoal(null)
  }

  function getAvgForClassroom(classroomId: string): number | null {
    // Get graded submissions for this classroom
    const classroomName = classrooms.find(c => c.id === classroomId)?.name
    if (!classroomName) return null
    const graded = assignments.filter(a => a.classroom.name === classroomName && a.submissions.length > 0 && a.submissions[0].status === 'GRADED')
    if (graded.length === 0) return null
    const scores = graded.map(a => a.submissions[0].totalScore ?? 0)
    return scores.reduce((s, v) => s + v, 0) / scores.length
  }

  async function joinClass(e: React.FormEvent) {
    e.preventDefault()
    setJoinError('')
    try {
      await api.post('/classrooms/join', { classCode })
      setShowJoin(false)
      setClassCode('')
      loadAll()
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
          <Link to="/student/assignments" className={NAV_ICON_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
            Assignments
          </Link>
          <Link to="/student/rankings" className={NAV_ICON_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
            </svg>
            Rankings
          </Link>
          <Link to="/student/progress" className={NAV_ICON_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            My Progress
          </Link>
          <Link to="/messages" className={NAV_ICON_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Messages
          </Link>
          <button onClick={() => setShowJoin(true)} className={NAV_ICON_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Join Class
          </button>
          <NotificationBell accent="teal" />
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
              <button type="submit" className="btn-3d-teal">Join</button>
              <button type="button" onClick={() => setShowJoin(false)} className="text-gray-500 px-3 text-sm">Cancel</button>
            </div>
            {joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
          </form>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : assignments.length === 0 && classrooms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-lg">No assignments yet</p>
            <p className="text-gray-400 text-sm mt-1">Join a class using a class code from your teacher</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* My Classes with grade goals and leaderboard */}
            {classrooms.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Classes</h2>
                <div className="space-y-3">
                  {classrooms.map(c => {
                    const goal = gradeGoals.find(g => g.classroomId === c.id)
                    const avg = getAvgForClassroom(c.id)
                    const lb = leaderboards[c.id]
                    const me = lb?.find(e => e.isCurrentUser)
                    let progressColor = 'bg-indigo-500'
                    if (goal && avg !== null) {
                      const diff = avg - goal.targetGrade
                      if (diff < -10) progressColor = 'bg-red-500'
                      else if (diff < 0) progressColor = 'bg-amber-500'
                      else progressColor = 'bg-indigo-500'
                    }
                    return (
                      <div key={c.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{c.name}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{c._count.assignments} assignments</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {me && (
                              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">#{me.rank} · {me.points} pts</span>
                            )}
                            {editingGoal === c.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number" min={0} max={100} value={goalValue}
                                  onChange={e => setGoalValue(e.target.value)}
                                  className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                                  autoFocus
                                  onKeyDown={e => { if (e.key === 'Enter') saveGoal(c.id); if (e.key === 'Escape') setEditingGoal(null) }}
                                />
                                <button onClick={() => saveGoal(c.id)} className="text-xs text-teal-600 font-medium">Save</button>
                                <button onClick={() => setEditingGoal(null)} className="text-xs text-gray-400">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingGoal(c.id); setGoalValue(goal?.targetGrade?.toString() ?? '') }}
                                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
                                  <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                                </svg>
                                {goal ? `Goal: ${goal.targetGrade}%` : 'Set goal'}
                              </button>
                            )}
                          </div>
                        </div>
                        {goal && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                              <span>Current avg: {avg !== null ? `${avg.toFixed(0)}%` : 'No grades yet'}</span>
                              <span>Goal: {goal.targetGrade}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressColor}`}
                                style={{ width: `${Math.min(100, avg !== null ? (avg / goal.targetGrade) * 100 : 0)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

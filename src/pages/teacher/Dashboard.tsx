import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TeacherNav from '../../components/TeacherNav'
import api from '../../api/client'

interface AtRiskStudent {
  studentId: string
  name: string
  reasons: string[]
}

interface Classroom {
  id: string
  name: string
  classCode: string
  yearLevel: number | null
  classPassword: string | null
  _count: { enrollments: number; assignments: number }
}

export default function TeacherDashboard() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newYearLevel, setNewYearLevel] = useState('')
  const [newClassPassword, setNewClassPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [atRisk, setAtRisk] = useState<{ classroomId: string; classroomName: string; students: AtRiskStudent[] }[]>([])

  useEffect(() => {
    api.get('/classrooms').then(r => {
      setClassrooms(r.data)
      setLoading(false)
      const rooms: Classroom[] = r.data
      Promise.all(
        rooms.map(c =>
          api.get(`/students/classrooms/${c.id}/at-risk`)
            .then(res => ({ classroomId: c.id, classroomName: c.name, students: res.data as AtRiskStudent[] }))
            .catch(() => ({ classroomId: c.id, classroomName: c.name, students: [] }))
        )
      ).then(results => setAtRisk(results.filter(r => r.students.length > 0)))
    })
  }, [])

  async function createClassroom(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await api.post('/classrooms', {
      name: newClassName,
      yearLevel: newYearLevel ? Number(newYearLevel) : undefined,
      classPassword: newClassPassword || undefined,
    })
    setClassrooms(c => [...c, { ...data, _count: { enrollments: 0, assignments: 0 } }])
    setNewClassName(''); setNewYearLevel(''); setNewClassPassword('')
    setShowCreate(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TeacherNav activePage="dashboard" />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Classrooms</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your classes and assignments</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-3d-indigo"
          >
            + New Classroom
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createClassroom} className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            <div className="flex gap-3">
              <input
                autoFocus
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                placeholder="Classroom name (e.g. Year 2 Maths)"
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <select
                value={newYearLevel}
                onChange={e => setNewYearLevel(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Year level</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            {newYearLevel && Number(newYearLevel) <= 6 && (
              <input
                value={newClassPassword}
                onChange={e => setNewClassPassword(e.target.value)}
                placeholder="Class password (for year 1-6 student login)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="text-gray-500 dark:text-gray-400 px-3 py-2 text-sm">Cancel</button>
              <button type="submit" className="btn-3d-indigo">Create</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-lg">No classrooms yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first classroom to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classrooms.map(c => (
              <Link
                key={c.id}
                to={`/teacher/classroom/${c.id}`}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white tracking-tight">{c.name}</h3>
                  {c.yearLevel && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium">
                      Yr {c.yearLevel}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-gray-400">
                  {c.classCode}
                </p>
                <div className="flex gap-6 mt-4 items-baseline">
                  <div className="flex items-baseline gap-1.5">
                    <b className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums leading-none">{c._count.enrollments}</b>
                    <span className="text-xs text-gray-500">students</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <b className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums leading-none">{c._count.assignments}</b>
                    <span className="text-xs text-gray-500">assignments</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {atRisk.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              At-Risk Students
            </h2>
            <div className="space-y-3">
              {atRisk.map(group => (
                <div key={group.classroomId} className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">{group.classroomName}</p>
                  <div className="space-y-1">
                    {group.students.map(s => (
                      <div key={s.studentId} className="flex items-center gap-3 text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                        <span className="text-gray-400">—</span>
                        <span className="text-gray-500 dark:text-gray-400">{s.reasons.join(', ')}</span>
                        <Link to={`/teacher/grades/${s.studentId}?classroomId=${group.classroomId}`} className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">View →</Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

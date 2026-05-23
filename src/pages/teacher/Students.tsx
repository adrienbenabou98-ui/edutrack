import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import TermIndicator from '../../components/TermIndicator'
import QuickGradeModal from '../../components/QuickGradeModal'

interface Student {
  id: string; name: string; email: string | null; username: string | null
  yearLevel: number | null; teacherCreated: boolean
}
interface Classroom {
  id: string; name: string; classCode: string; yearLevel: number | null
  enrollments: { student: Student }[]
}

export default function Students() {
  const navigate = useNavigate()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [quickGrade, setQuickGrade] = useState<{ studentId: string; studentName: string; classroomId: string } | null>(null)

  useEffect(() => {
    api.get('/classrooms').then(async r => {
      const cls: Classroom[] = r.data
      const detailed = await Promise.all(cls.map((c: Classroom) => api.get(`/classrooms/${c.id}`).then(r => r.data)))
      setClassrooms(detailed)
      setLoading(false)
    })
  }, [])

  // Flatten to unique students (a student can be in multiple classrooms)
  type StudentEntry = { student: Student; classroom: Classroom }
  const all: StudentEntry[] = []
  const seen = new Set<string>()
  classrooms.forEach(c => {
    c.enrollments.forEach(e => {
      if (!seen.has(e.student.id)) {
        seen.add(e.student.id)
        all.push({ student: e.student, classroom: c })
      }
    })
  })

  const filtered = search.trim()
    ? all.filter(({ student }) =>
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.email?.toLowerCase().includes(search.toLowerCase()) ||
        student.username?.toLowerCase().includes(search.toLowerCase())
      )
    : all

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">← Dashboard</button>
          <span className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">Students</span>
        </div>
        <TermIndicator />
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">{all.length} student{all.length !== 1 ? 's' : ''} across {classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}</p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or username…"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            {search ? 'No students match your search.' : 'No students enrolled yet.'}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(({ student: s, classroom: c }) => (
              <div key={s.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-sm shrink-0">
                  {s.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/teacher/grades/${s.id}?classroomId=${c.id}`)}
                    className="font-medium text-gray-900 dark:text-white text-sm hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                  >
                    {s.name}
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.username ? `@${s.username}` : s.email ?? '—'}
                    {s.yearLevel && <span className="ml-2 text-indigo-400">Yr {s.yearLevel}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{c.name}</span>
                  <button
                    onClick={() => setQuickGrade({ studentId: s.id, studentName: s.name, classroomId: c.id })}
                    title="Add / edit grades"
                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => navigate(`/teacher/grades/${s.id}?classroomId=${c.id}`)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View profile →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {quickGrade && (
        <QuickGradeModal
          studentId={quickGrade.studentId}
          studentName={quickGrade.studentName}
          classroomId={quickGrade.classroomId}
          onClose={() => setQuickGrade(null)}
        />
      )}
    </div>
  )
}

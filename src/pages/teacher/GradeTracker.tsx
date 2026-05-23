import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useBoundaryStore } from '../../store/gradeBoundary.store'
import GradeCell from '../../components/GradeCell'
import CurveModal from '../../components/CurveModal'
import ExternalGradesSection from '../../components/ExternalGradesSection'
import TermIndicator from '../../components/TermIndicator'
import NavStudentsIcon from '../../components/NavStudentsIcon'
import api from '../../api/client'

interface Classroom { id: string; name: string }

interface StudentRow {
  studentId: string
  name: string
  overall: number | null
  gradeLabel: string | null
  gradeColour: string | null
  category: 'needs_support' | 'meeting' | 'exceeding' | null
  hasComment: boolean
}

interface TrackerData {
  students: StudentRow[]
  counts: { needs_support: number; meeting: number; exceeding: number; ungraded: number }
}

const CATEGORY_STYLE: Record<string, string> = {
  needs_support: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300',
  meeting: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300',
  exceeding: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300',
}

type GradeTab = 'overview' | 'custom'

export default function GradeTracker() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const logout = useAuthStore(s => s.logout)
  const user = useAuthStore(s => s.user)
  const { boundaries, loaded: boundariesLoaded, load: loadBoundaries } = useBoundaryStore()

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [data, setData] = useState<TrackerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [curveStudent, setCurveStudent] = useState<StudentRow | null>(null)
  const [showCurveAll, setShowCurveAll] = useState(false)
  const [gradeTab, setGradeTab] = useState<GradeTab>('overview')
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!boundariesLoaded) loadBoundaries()
    api.get('/classrooms').then(r => {
      setClassrooms(r.data)
      const fromParam = searchParams.get('classroomId')
      if (fromParam && r.data.find((c: Classroom) => c.id === fromParam)) {
        setSelectedId(fromParam)
      } else if (r.data.length > 0) {
        setSelectedId(r.data[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setData(null)
    api.get(`/grade-tracker/classroom/${selectedId}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
    // Fetch enrolled students for Custom Grades tab
    api.get(`/classrooms/${selectedId}`).then(r => {
      setEnrolledStudents(r.data.enrollments.map((e: any) => ({ id: e.student.id, name: e.student.name })))
    })
  }, [selectedId])

  function refresh() {
    if (!selectedId) return
    setLoading(true)
    api.get(`/grade-tracker/classroom/${selectedId}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }

  const counts = data?.counts
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">← Dashboard</button>
          <span className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">Grade Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <TermIndicator />
          <NavStudentsIcon />
          <button onClick={() => navigate('/teacher/settings')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">Settings</button>
          <span className="text-sm text-gray-600 dark:text-gray-300">{user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={() => setGradeTab('overview')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${gradeTab === 'overview' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              Overview
            </button>
            <button onClick={() => setGradeTab('custom')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${gradeTab === 'custom' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              Custom Grades
            </button>
          </div>

          {gradeTab === 'overview' && selectedId && (
            <button
              onClick={() => setShowCurveAll(true)}
              className="px-4 py-2 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              Curve all assignments
            </button>
          )}
        </div>

        {gradeTab === 'overview' && (
          <>
            {counts && total > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { key: 'needs_support', label: 'Needs Support', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
                  { key: 'meeting', label: 'Meeting', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800' },
                  { key: 'exceeding', label: 'Exceeding', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' },
                  { key: 'ungraded', label: 'Ungraded', color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
                ].map(({ key, label, color, bg }) => (
                  <div key={key} className={`rounded-xl border p-4 ${bg}`}>
                    <p className={`text-2xl font-bold ${color}`}>{counts[key as keyof typeof counts]}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                    {total > 0 && (
                      <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width: `${(counts[key as keyof typeof counts] / total) * 100}%`, backgroundColor: key === 'needs_support' ? '#ef4444' : key === 'meeting' ? '#eab308' : key === 'exceeding' ? '#22c55e' : '#9ca3af' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {loading && <div className="text-center py-16 text-gray-400">Loading…</div>}

            {!loading && data && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Student</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Overall</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Category</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Comment</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-gray-400">No students enrolled</td></tr>
                    ) : data.students.map(s => (
                      <tr key={s.studentId} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3">
                          <button
                            onClick={() => navigate(`/teacher/grades/${s.studentId}?classroomId=${selectedId}`)}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                          >
                            {s.name}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          {boundariesLoaded && <GradeCell value={s.overall} boundaries={boundaries} readOnly size="sm" />}
                        </td>
                        <td className="px-5 py-3">
                          {s.category ? (
                            <span className={`text-xs px-2 py-1 rounded-full border font-medium ${CATEGORY_STYLE[s.category]}`}>
                              {s.category === 'needs_support' ? 'Needs Support' : s.category === 'meeting' ? 'Meeting' : 'Exceeding'}
                            </span>
                          ) : <span className="text-xs text-gray-400">No grades</span>}
                        </td>
                        <td className="px-5 py-3">
                          {s.hasComment
                            ? <span className="text-xs text-indigo-500">Has note</span>
                            : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => navigate(`/teacher/grades/${s.studentId}?classroomId=${selectedId}`)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium"
                          >
                            View detail →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {gradeTab === 'custom' && selectedId && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <ExternalGradesSection
              classroomId={selectedId}
              students={enrolledStudents}
              boundaries={boundaries}
            />
          </div>
        )}
      </main>

      {showCurveAll && (
        <CurveModal
          classroomId={selectedId}
          scope="all"
          onClose={() => setShowCurveAll(false)}
          onApplied={refresh}
        />
      )}
    </div>
  )
}

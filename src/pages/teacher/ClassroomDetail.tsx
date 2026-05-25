import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useBoundaryStore } from '../../store/gradeBoundary.store'
import ExternalGradesSection from '../../components/ExternalGradesSection'
import UnitsSection from '../../components/UnitsSection'
import TermIndicator from '../../components/TermIndicator'
import NavStudentsIcon from '../../components/NavStudentsIcon'
import QuickGradeModal from '../../components/QuickGradeModal'
import NotificationBell from '../../components/NotificationBell'
import LeaderboardTab from '../../components/LeaderboardTab'
import SeatingTab from '../../components/SeatingTab'

interface Assignment {
  id: string; title: string; type: string; status: string; dueDate: string | null
  _count: { submissions: number; questions: number }
  plagiarismFlag?: boolean; plagiarismReport?: string | null
}
interface Student {
  id: string; name: string; email: string | null; username: string | null
  yearLevel: number | null; teacherCreated: boolean
}
interface Classroom {
  id: string; name: string; classCode: string; classPassword: string | null; yearLevel: number | null
  enrollments: { student: Student }[]
  assignments: Assignment[]
}
interface LeaderboardEntry {
  studentId: string; name: string; points: number; rank: number; isCurrentUser: boolean
}

type Tab = 'assignments' | 'students' | 'ext-grades' | 'units' | 'leaderboard' | 'seating'

interface StudentForm { name: string; username: string; email: string; password: string; yearLevel: string }
const emptyStudentForm = (): StudentForm => ({ name: '', username: '', email: '', password: '', yearLevel: '' })

interface ClassSettingsForm { yearLevel: string }

export default function ClassroomDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [tab, setTab] = useState<Tab>('assignments')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [plagiarismModal, setPlagiarismModal] = useState<{ report: string; submissionId: string } | null>(null)

  const { boundaries, loaded, load } = useBoundaryStore()
  useEffect(() => { if (!loaded) load() }, [loaded])

  useEffect(() => {
    api.get(`/classrooms/${id}`).then(r => setClassroom(r.data))
  }, [id])

  useEffect(() => {
    if (tab === 'leaderboard' && id) {
      api.get(`/classrooms/${id}/leaderboard`).then(r => setLeaderboard(r.data)).catch(() => {})
    }
  }, [tab, id])

  async function dismissPlagiarism(submissionId: string) {
    await api.put(`/submissions/${submissionId}/dismiss-plagiarism`)
    setPlagiarismModal(null)
    // Refresh classroom data to update flag
    api.get(`/classrooms/${id}`).then(r => setClassroom(r.data))
  }

  // Student management state
  const [quickGrade, setQuickGrade] = useState<{ studentId: string; studentName: string } | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [editStudentId, setEditStudentId] = useState<string | null>(null)
  const [studentForm, setStudentForm] = useState<StudentForm>(emptyStudentForm())
  const [studentSaving, setStudentSaving] = useState(false)
  const [studentError, setStudentError] = useState('')
  // Classroom settings state
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<ClassSettingsForm>({ yearLevel: '' })
  const [settingsSaving, setSettingsSaving] = useState(false)
  useEffect(() => {
    if (classroom) {
      setSettingsForm({ yearLevel: classroom.yearLevel?.toString() ?? '' })
    }
  }, [classroom])

  if (!classroom) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  const students = classroom.enrollments.map(e => e.student)
  const TAB_LABELS: [Tab, string][] = [
    ['assignments', `Assignments (${classroom.assignments.length})`],
    ['students', `Students (${classroom.enrollments.length})`],
    ['ext-grades', 'Assignment Grades'],
    ['units', 'Units'],
    ['leaderboard', 'Leaderboard'],
    ['seating', 'Seating'],
  ]

  async function handleStudentSave(e: React.FormEvent) {
    e.preventDefault()
    setStudentSaving(true); setStudentError('')
    try {
      if (editStudentId) {
        const { data } = await api.put(`/classrooms/${id}/students/${editStudentId}`, {
          name: studentForm.name,
          username: studentForm.username || undefined,
          email: studentForm.email || undefined,
          yearLevel: studentForm.yearLevel ? Number(studentForm.yearLevel) : undefined,
        })
        setClassroom(c => c ? {
          ...c,
          enrollments: c.enrollments.map(e => e.student.id === editStudentId ? { student: { ...e.student, ...data } } : e),
        } : c)
      } else {
        const { data } = await api.post(`/classrooms/${id}/students`, {
          name: studentForm.name,
          username: studentForm.username || undefined,
          email: studentForm.email || undefined,
          password: studentForm.password || undefined,
          yearLevel: studentForm.yearLevel ? Number(studentForm.yearLevel) : undefined,
        })
        setClassroom(c => c ? { ...c, enrollments: [...c.enrollments, { student: data }] } : c)
      }
      setShowStudentModal(false); setEditStudentId(null); setStudentForm(emptyStudentForm())
    } catch (err: any) {
      setStudentError(err.response?.data?.error ?? 'Failed to save student')
    } finally {
      setStudentSaving(false)
    }
  }

  async function handleRemoveStudent(studentId: string, teacherCreated: boolean) {
    const msg = teacherCreated
      ? 'This will permanently delete the student profile and all their data. Continue?'
      : 'This will remove the student from this class. Continue?'
    if (!confirm(msg)) return
    await api.delete(`/classrooms/${id}/students/${studentId}`)
    setClassroom(c => c ? { ...c, enrollments: c.enrollments.filter(e => e.student.id !== studentId) } : c)
  }

  async function handleSettingsSave(e: React.FormEvent) {
    e.preventDefault()
    setSettingsSaving(true)
    try {
      const { data } = await api.patch(`/classrooms/${id}`, {
        yearLevel: settingsForm.yearLevel ? Number(settingsForm.yearLevel) : null,
      })
      setClassroom(c => c ? { ...c, yearLevel: data.yearLevel } : c)
      setShowSettings(false)
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/teacher" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">← Back</Link>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">{classroom.name}</span>
          {classroom.yearLevel && (
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium">Year {classroom.yearLevel}</span>
          )}
          <span className="text-xs text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Code: {classroom.classCode}</span>
        </div>
        <div className="flex items-center gap-3">
          <NavStudentsIcon />
          <TermIndicator />
          <NotificationBell accent="indigo" />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-wrap">
            {TAB_LABELS.map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 shrink-0">
            {tab === 'assignments' && (
              <>
                <Link to={`/teacher/classroom/${id}/analytics`}
                  className="border border-indigo-300 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                  Analytics
                </Link>
                <Link to={`/teacher/classroom/${id}/new-assignment`}
                  className="btn-3d-indigo">
                  + New Assignment
                </Link>
              </>
            )}
            {tab === 'students' && (
              <>
                <button
                  onClick={() => setShowSettings(s => !s)}
                  className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Class settings
                </button>
                <button
                  onClick={() => { setShowStudentModal(true); setEditStudentId(null); setStudentForm(emptyStudentForm()); setStudentError('') }}
                  className="btn-3d-indigo"
                >
                  + Add Student
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline class settings panel */}
        {tab === 'students' && showSettings && (
          <form onSubmit={handleSettingsSave} className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year level</label>
              <select value={settingsForm.yearLevel} onChange={e => setSettingsForm(f => ({ ...f, yearLevel: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Not set</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowSettings(false)} className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Cancel</button>
              <button type="submit" disabled={settingsSaving} className="btn-3d-indigo disabled:opacity-50">
                {settingsSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {/* Class login info bar — shown whenever there are teacher-created students */}
        {tab === 'students' && classroom.enrollments.some(e => e.student.teacherCreated) && !showSettings && (
          <div className="mb-4 flex items-center gap-2 flex-wrap bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <span className="text-sm text-indigo-700 dark:text-indigo-300">
              Students log in with their username + class code&nbsp;
              <span className="font-mono font-semibold bg-indigo-100 dark:bg-indigo-800 px-1.5 py-0.5 rounded">{classroom.classCode}</span>
            </span>
          </div>
        )}

        {tab === 'assignments' && (
          classroom.assignments.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-gray-400">No assignments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classroom.assignments.map(a => (
                <div key={a.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{a.title}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {a.type} · {a._count?.questions ?? 0} questions · {a._count?.submissions ?? 0} submissions
                      {a.dueDate && ` · Due ${new Date(a.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(a as any).plagiarismFlag && (
                      <button
                        onClick={() => setPlagiarismModal({ report: (a as any).plagiarismReport ?? 'No details', submissionId: a.id })}
                        className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                      >
                        ⚠ Plagiarism flag
                      </button>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      a.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{a.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'students' && (
          classroom.enrollments.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-400">No students yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Use <strong>+ Add Student</strong> to create accounts, or share code{' '}
                <span className="font-mono font-medium text-gray-600 dark:text-gray-300">{classroom.classCode}</span> for self-sign-up.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {classroom.enrollments.map(e => {
                const s = e.student
                return (
                  <div key={s.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-sm shrink-0">
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/teacher/grades/${s.id}?classroomId=${id}`)}
                        className="font-medium text-gray-900 dark:text-white text-sm hover:text-indigo-600 dark:hover:text-indigo-400 text-left"
                      >
                        {s.name}
                      </button>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.username ? `@${s.username}` : s.email ?? '—'}
                        {s.yearLevel && <span className="ml-2 text-indigo-400">Yr {s.yearLevel}</span>}
                        {s.teacherCreated && <span className="ml-2 text-gray-300 dark:text-gray-600">· teacher-created</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/teacher/grades/${s.id}?classroomId=${id}`)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View profile →
                      </button>
                      <button
                        onClick={() => setQuickGrade({ studentId: s.id, studentName: s.name })}
                        title="Add / edit grades"
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setEditStudentId(s.id)
                          setStudentForm({ name: s.name, username: s.username ?? '', email: s.email ?? '', password: '', yearLevel: s.yearLevel?.toString() ?? '' })
                          setStudentError('')
                          setShowStudentModal(true)
                        }}
                        className="text-xs border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >Edit</button>
                      <button
                        onClick={() => handleRemoveStudent(s.id, s.teacherCreated)}
                        className="text-xs border border-red-200 dark:border-red-800 text-red-500 rounded-lg px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'ext-grades' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <ExternalGradesSection classroomId={classroom.id} students={students.map(s => ({ id: s.id, name: s.name }))} boundaries={boundaries} />
          </div>
        )}

        {tab === 'units' && (
          <UnitsSection classroomId={classroom.id} students={students.map(s => ({ id: s.id, name: s.name }))} boundaries={boundaries} />
        )}

        {tab === 'leaderboard' && (
          <LeaderboardTab entries={leaderboard} isTeacher />
        )}

        {tab === 'seating' && (
          <SeatingTab classroomId={classroom.id} students={students} />
        )}
      </main>

      {/* Plagiarism report modal */}
      {plagiarismModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Plagiarism Report</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{plagiarismModal.report}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPlagiarismModal(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Close</button>
              <button
                onClick={() => dismissPlagiarism(plagiarismModal.submissionId)}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Dismiss Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {quickGrade && (
        <QuickGradeModal
          studentId={quickGrade.studentId}
          studentName={quickGrade.studentName}
          classroomId={classroom.id}
          onClose={() => setQuickGrade(null)}
        />
      )}

      {/* Add/Edit Student modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{editStudentId ? 'Edit Student' : 'Add Student'}</h3>
              <button onClick={() => setShowStudentModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {studentError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                {studentError}
              </div>
            )}

            <form onSubmit={handleStudentSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
                <input value={studentForm.name} onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))} required
                  placeholder="e.g. Alice Johnson"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year level</label>
                <select value={studentForm.yearLevel} onChange={e => setStudentForm(f => ({ ...f, yearLevel: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Not specified</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username <span className="font-normal text-gray-400">(used to log in)</span>
                </label>
                <input value={studentForm.username} onChange={e => setStudentForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. alice.j"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-xs text-gray-400 mt-1">
                  Student logs in with this username + class code <span className="font-mono font-medium">{classroom.classCode}</span>
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" disabled={studentSaving}
                  className="btn-3d-indigo disabled:opacity-50">
                  {studentSaving ? 'Saving…' : editStudentId ? 'Save' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

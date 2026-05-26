import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useBoundaryStore } from '../../store/gradeBoundary.store'
import type { Boundary } from '../../store/gradeBoundary.store'
import GradeCell from '../../components/GradeCell'
import GradeBreakdownBar from '../../components/GradeBreakdownBar'
import CurveModal from '../../components/CurveModal'
import PdfExportModal from '../../components/PdfExportModal'
import TermIndicator from '../../components/TermIndicator'
import NavStudentsIcon from '../../components/NavStudentsIcon'
import api from '../../api/client'

interface TimelineEvent {
  type: string
  date: string
  title: string
  detail: string | null
}
interface ParentContact {
  id: string
  type: string
  summary: string
  outcome: string | null
  date: string
}

interface AssignmentRow {
  assignmentId: string
  submissionId: string | null
  title: string
  score: number | null
  grade: { label: string; colour: string } | null
  curveNote: string | null
  status: string | null
}

interface Unit {
  unitName: string
  rows: AssignmentRow[]
  unitAvg: number | null
  unitGrade: { label: string; colour: string } | null
}

interface Subject {
  subject: string
  units: Unit[]
  subjectAvg: number | null
  subjectGrade: { label: string; colour: string } | null
}

interface Comment { strengths: string; weaknesses: string; notes: string }
interface Student { id: string; name: string; email: string }

interface CustomItem {
  id: string; title: string; description: string | null; weight: number; totalMarks: number; score: number | null; scorePct: number | null
}
interface CustomBreakdown {
  items: CustomItem[]; quizAvg: number | null; quizWeight: number; totalCustomWeight: number
}
interface DetailData {
  student: Student
  subjects: Subject[]
  overallAvg: number | null
  overallGrade: { label: string; colour: string } | null
  boundaries: Boundary[]
  comment: Comment | null
  customBreakdown: CustomBreakdown
}

export default function StudentGradeDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const [searchParams] = useSearchParams()
  const classroomId = searchParams.get('classroomId') ?? ''
  const navigate = useNavigate()

  const { boundaries: storeBoundaries, loaded: storeBoundariesLoaded, load: loadBoundaries } = useBoundaryStore()

  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState<Comment>({ strengths: '', weaknesses: '', notes: '' })
  const [savingComment, setSavingComment] = useState(false)
  const [commentSaved, setCommentSaved] = useState(false)
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set())
  const [curveAssignment, setCurveAssignment] = useState<{ id: string; title: string } | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [units, setUnits] = useState<{ id: string; name: string }[]>([])
  const [customItems, setCustomItems] = useState<CustomItem[]>([])

  type DetailTab = 'grades' | 'timeline' | 'contacts'
  const [activeTab, setActiveTab] = useState<DetailTab>('grades')
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [contacts, setContacts] = useState<ParentContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactForm, setContactForm] = useState({ type: 'Email', summary: '', outcome: '' })
  const [addingContact, setAddingContact] = useState(false)

  useEffect(() => {
    if (!storeBoundariesLoaded) loadBoundaries()
  }, [])

  useEffect(() => {
    if (activeTab === 'timeline' && studentId) {
      setTimelineLoading(true)
      api.get(`/students/${studentId}/timeline`)
        .then(r => setTimeline(r.data))
        .catch(() => setTimeline([]))
        .finally(() => setTimelineLoading(false))
    }
    if (activeTab === 'contacts' && studentId) {
      setContactsLoading(true)
      api.get(`/students/${studentId}/contacts`)
        .then(r => setContacts(r.data))
        .catch(() => setContacts([]))
        .finally(() => setContactsLoading(false))
    }
  }, [activeTab, studentId])

  useEffect(() => {
    if (!classroomId) return
    api.get(`/units/classroom/${classroomId}`).then(r => setUnits(r.data.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))))
  }, [classroomId])

  useEffect(() => {
    if (!studentId || !classroomId) return
    api.get(`/grade-tracker/student/${studentId}`, { params: { classroomId } })
      .then(r => {
        setData(r.data)
        if (r.data.comment) setComment({ strengths: r.data.comment.strengths ?? '', weaknesses: r.data.comment.weaknesses ?? '', notes: r.data.comment.notes ?? '' })
        const subjects = r.data.subjects as Subject[]
        setOpenSubjects(new Set(subjects.map(s => s.subject)))
        setCustomItems(r.data.customBreakdown?.items ?? [])
      })
      .finally(() => setLoading(false))
  }, [studentId, classroomId])

  async function saveComment() {
    if (!studentId) return
    setSavingComment(true)
    try {
      await api.put(`/grade-tracker/student/${studentId}/comment`, comment)
      setCommentSaved(true)
      setTimeout(() => setCommentSaved(false), 2000)
    } finally {
      setSavingComment(false)
    }
  }

  function toggleSubject(subject: string) {
    setOpenSubjects(s => {
      const next = new Set(s)
      if (next.has(subject)) next.delete(subject); else next.add(subject)
      return next
    })
  }

  async function saveExtGrade(assignmentId: string, score: number | null) {
    await api.put(`/external-grades/assignments/${assignmentId}/grades/${studentId}`, { score })
    setCustomItems(prev => prev.map(a => {
      if (a.id !== assignmentId) return a
      const scorePct = score !== null ? (score / a.totalMarks) * 100 : null
      return { ...a, score, scorePct }
    }))
  }

  function refresh() {
    if (!studentId || !classroomId) return
    api.get(`/grade-tracker/student/${studentId}`, { params: { classroomId } })
      .then(r => { setData(r.data); setCustomItems(r.data.customBreakdown?.items ?? []) })
  }

  const boundaries = data?.boundaries ?? storeBoundaries

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(classroomId ? `/teacher/grades?classroomId=${classroomId}` : '/teacher/grades')}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            ← Grade Tracker
          </button>
          <span className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">
            {data?.student.name ?? 'Student Detail'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <NavStudentsIcon />
          <TermIndicator />
          {data && (
            <button
              onClick={() => setShowPdfModal(true)}
              className="btn-3d-indigo px-3 py-1.5"
            >
              Download Report
            </button>
          )}
        </div>
      </nav>

      {loading && <div className="text-center py-16 text-gray-400">Loading…</div>}

      {!loading && data && (
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            {([['grades', 'Grades'], ['timeline', 'Timeline'], ['contacts', 'Parent Contacts']] as [DetailTab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          {activeTab === 'grades' && (<>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-400">{data.student.email}</p>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-0.5">{data.student.name}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Overall</p>
                <GradeCell value={data.overallAvg} boundaries={boundaries} readOnly />
              </div>
            </div>
            {data.customBreakdown && (data.customBreakdown.totalCustomWeight > 0 || data.customBreakdown.quizWeight > 0) && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-2">Grade composition</p>
                <GradeBreakdownBar
                  quizWeight={data.customBreakdown.quizWeight}
                  quizScore={data.customBreakdown.quizAvg}
                  customItems={data.customBreakdown.items.map(c => ({ title: c.title, weight: c.weight, scorePct: c.scorePct }))}
                  boundaries={boundaries}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {data.subjects.map(subject => (
              <div key={subject.subject} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => toggleSubject(subject.subject)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{subject.subject}</span>
                    <GradeCell value={subject.subjectAvg} boundaries={boundaries} readOnly size="sm" />
                  </div>
                  <span className="text-gray-400 text-sm">{openSubjects.has(subject.subject) ? '▲' : '▼'}</span>
                </button>

                {openSubjects.has(subject.subject) && (
                  <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
                    {subject.units.map(unit => (
                      <div key={unit.unitName} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{unit.unitName}</span>
                          <GradeCell value={unit.unitAvg} boundaries={boundaries} readOnly size="sm" />
                        </div>
                        <table className="w-full">
                          <tbody>
                            {unit.rows.map(row => (
                              <tr key={row.assignmentId} className="group">
                                <td className="py-1.5 pr-4">
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{row.title}</span>
                                  {row.curveNote && (
                                    <span className="ml-2 text-xs text-indigo-400" title={row.curveNote}>curved</span>
                                  )}
                                </td>
                                <td className="py-1.5 pr-4">
                                  {row.status ? (
                                    <GradeCell value={row.score} boundaries={boundaries} readOnly size="sm" />
                                  ) : (
                                    <span className="text-xs text-gray-300 dark:text-gray-600">No submission</span>
                                  )}
                                </td>
                                <td className="py-1.5 text-right">
                                  {row.submissionId && (
                                    <button
                                      onClick={() => setCurveAssignment({ id: row.assignmentId, title: row.title })}
                                      className="text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      Curve
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {data.subjects.length === 0 && (
              <div className="text-center py-8 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                No graded assignments yet
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Custom Grades</h3>
              <span className="text-xs text-gray-400">Synced with Grade Tracker → Custom Grades</span>
            </div>
            {customItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No custom assignments yet. Add them in Grade Tracker → Custom Grades or Classroom → Assignment Grades.
              </p>
            ) : (
              <div className="space-y-2">
                {customItems.map(a => (
                  <div key={a.id} className="flex items-center gap-4 py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                        {a.weight > 0 && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-medium">{a.weight}%</span>
                        )}
                      </div>
                      {a.description && <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>}
                      <p className="text-xs text-gray-400">/{a.totalMarks}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={a.totalMarks}
                        value={a.score ?? ''}
                        onChange={e => {
                          const v = e.target.value === '' ? null : Math.min(a.totalMarks, Math.max(0, Number(e.target.value)))
                          saveExtGrade(a.id, v)
                        }}
                        placeholder="—"
                        className="w-16 text-center text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-1 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      {a.scorePct !== null && (
                        <GradeCell value={a.scorePct} boundaries={boundaries} readOnly size="sm" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Teacher Notes</h3>
            <div className="space-y-4">
              {([['strengths', 'Strengths'], ['weaknesses', 'Areas for improvement'], ['notes', 'Private notes']] as [keyof Comment, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <textarea
                    value={comment[field]}
                    onChange={e => setComment(c => ({ ...c, [field]: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder={`Enter ${label.toLowerCase()}…`}
                  />
                </div>
              ))}
              <div className="flex justify-end">
                <button
                  onClick={saveComment}
                  disabled={savingComment}
                  className="btn-3d-indigo disabled:opacity-50"
                >
                  {commentSaved ? 'Saved!' : savingComment ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </div>
          </div>
          </>)}

          {activeTab === 'timeline' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline</h3>
              {timelineLoading ? (
                <div className="text-center py-8 text-gray-400">Loading…</div>
              ) : timeline.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">No activity recorded yet.</p>
              ) : (
                <ol className="relative border-l border-gray-200 dark:border-gray-700 space-y-4 pl-4">
                  {timeline.map((ev, i) => (
                    <li key={i} className="ml-2">
                      <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white dark:border-gray-800" />
                      <time className="text-xs text-gray-400">{new Date(ev.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.title}</p>
                      {ev.detail && <p className="text-xs text-gray-500 dark:text-gray-400">{ev.detail}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Log Parent Contact</h3>
                <form onSubmit={async e => {
                  e.preventDefault()
                  setAddingContact(true)
                  try {
                    const { data: created } = await api.post(`/students/${studentId}/contacts`, {
                      type: contactForm.type,
                      summary: contactForm.summary,
                      outcome: contactForm.outcome || undefined,
                    })
                    setContacts(prev => [created, ...prev])
                    setContactForm({ type: 'Email', summary: '', outcome: '' })
                  } finally {
                    setAddingContact(false)
                  }
                }} className="space-y-3">
                  <div className="flex gap-3 flex-wrap">
                    <select value={contactForm.type} onChange={e => setContactForm(f => ({ ...f, type: e.target.value }))}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {['Email', 'Phone', 'In person', 'Letter', 'Other'].map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input value={contactForm.outcome} onChange={e => setContactForm(f => ({ ...f, outcome: e.target.value }))}
                      placeholder="Outcome (optional)"
                      className="flex-1 min-w-[160px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <textarea value={contactForm.summary} onChange={e => setContactForm(f => ({ ...f, summary: e.target.value }))}
                    required rows={2} placeholder="Summary of the contact…"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  <div className="flex justify-end">
                    <button type="submit" disabled={addingContact} className="btn-3d-indigo disabled:opacity-50">
                      {addingContact ? 'Saving…' : 'Log contact'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Contact History</h3>
                {contactsLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading…</div>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">No contacts logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map(c => (
                      <div key={c.id} className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-medium shrink-0">{c.type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200">{c.summary}</p>
                          {c.outcome && <p className="text-xs text-gray-500 mt-0.5">Outcome: {c.outcome}</p>}
                          <time className="text-xs text-gray-400">{new Date(c.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                        </div>
                        <button onClick={async () => {
                          await api.delete(`/students/${studentId}/contacts/${c.id}`)
                          setContacts(prev => prev.filter(x => x.id !== c.id))
                        }} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {curveAssignment && (
        <CurveModal
          classroomId={classroomId}
          assignmentId={curveAssignment.id}
          scope="assignment"
          onClose={() => setCurveAssignment(null)}
          onApplied={() => { setCurveAssignment(null); refresh() }}
        />
      )}

      {showPdfModal && data && (
        <PdfExportModal
          studentId={data.student.id}
          studentName={data.student.name}
          classroomId={classroomId}
          units={units}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import api from '../../api/client'

interface Assignment {
  id: string
  title: string
  type: string
  status: string
  createdAt: string
  classroom: { id: string; name: string; teacher: { name: string } }
  _count: { submissions: number; questions: number }
}

interface Submission {
  id: string
  submittedAt: string
  totalScore: number | null
  curvedScore: number | null
  status: string
  plagiarismFlag: boolean
  plagiarismReport: string | null
  student: { id: string; name: string; email: string | null }
}

export default function Content() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({})
  const [gradeModal, setGradeModal] = useState<Submission | null>(null)
  const [gradeValue, setGradeValue] = useState('')
  const [gradeNote, setGradeNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteAssignId, setDeleteAssignId] = useState<string | null>(null)
  const [plagiarismModal, setPlagiarismModal] = useState<Submission | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const { data } = await api.get(`/admin/content/assignments?${params}`)
      setAssignments(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search])

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!submissions[id]) {
      const { data } = await api.get(`/admin/content/assignments/${id}/submissions`)
      setSubmissions(s => ({ ...s, [id]: data }))
    }
  }

  async function handleOverrideGrade() {
    if (!gradeModal) return
    setSaving(true)
    try {
      await api.put(`/admin/content/submissions/${gradeModal.id}/grade`, { totalScore: Number(gradeValue), curveNote: gradeNote || undefined })
      setSubmissions(s => ({
        ...s,
        ...Object.fromEntries(Object.entries(s).map(([aid, subs]) => [
          aid,
          subs.map(sub => sub.id === gradeModal.id ? { ...sub, totalScore: Number(gradeValue), status: 'GRADED' } : sub),
        ])),
      }))
      setGradeModal(null)
    } finally { setSaving(false) }
  }

  async function handleDeleteAssignment() {
    if (!deleteAssignId) return
    setSaving(true)
    try {
      await api.delete(`/admin/content/assignments/${deleteAssignId}`)
      setDeleteAssignId(null)
      load()
    } finally { setSaving(false) }
  }

  async function handleDeleteSubmission(assignmentId: string, submissionId: string) {
    await api.delete(`/admin/content/submissions/${submissionId}`)
    setSubmissions(s => ({ ...s, [assignmentId]: s[assignmentId].filter(sub => sub.id !== submissionId) }))
  }

  async function handleDismissPlagiarism(sub: Submission) {
    await api.put(`/submissions/${sub.id}/dismiss-plagiarism`)
    setSubmissions(s => ({
      ...s,
      ...Object.fromEntries(Object.entries(s).map(([aid, subs]) => [
        aid,
        subs.map(item => item.id === sub.id ? { ...item, plagiarismFlag: false, plagiarismReport: null } : item),
      ])),
    }))
    setPlagiarismModal(null)
  }

  const TYPE_COLOURS: Record<string, string> = {
    ASSIGNMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    QUIZ:       'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    EXAM:       'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content & Grades</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">View all assignments and override grades</p>
        </div>

        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments…"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500 dark:text-gray-400">No assignments found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Assignment</th>
                  <th className="px-4 py-3 text-left">Classroom</th>
                  <th className="px-4 py-3 text-left">Teacher</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Submissions</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {assignments.map(a => (
                  <>
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                        <p className="text-xs text-gray-400">{a._count.questions} question{a._count.questions !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.classroom.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.classroom.teacher.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOURS[a.type] ?? ''}`}>{a.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a._count.submissions}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleExpand(a.id)} className="px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded">
                            {expanded === a.id ? 'Hide' : 'Submissions'}
                          </button>
                          <button onClick={() => setDeleteAssignId(a.id)} className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">Delete</button>
                        </div>
                      </td>
                    </tr>
                    {expanded === a.id && (
                      <tr key={`${a.id}-subs`}>
                        <td colSpan={7} className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30">
                          {!submissions[a.id] ? (
                            <div className="text-xs text-gray-400">Loading…</div>
                          ) : submissions[a.id].length === 0 ? (
                            <div className="text-xs text-gray-400">No submissions yet</div>
                          ) : (
                            <div className="space-y-1.5">
                              {submissions[a.id].map(sub => (
                                <div key={sub.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-medium text-gray-900 dark:text-white">{sub.student.name}</p>
                                      {sub.plagiarismFlag && (
                                        <button
                                          onClick={() => setPlagiarismModal(sub)}
                                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium hover:bg-red-200"
                                        >⚠ Plagiarism</button>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                      Score: {sub.totalScore !== null ? `${sub.totalScore}%` : 'Not graded'} · {sub.status}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => { setGradeModal(sub); setGradeValue(String(sub.totalScore ?? '')); setGradeNote('') }}
                                      className="px-2 py-1 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                                    >Override Grade</button>
                                    <button onClick={() => handleDeleteSubmission(a.id, sub.id)} className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">Delete</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {gradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Override Grade</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{gradeModal.student.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Score (%)</label>
                <input type="number" min="0" max="100" value={gradeValue} onChange={e => setGradeValue(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
                <input value={gradeNote} onChange={e => setGradeNote(e.target.value)} placeholder="Reason for override"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setGradeModal(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleOverrideGrade} disabled={saving || !gradeValue} className="btn-3d-indigo disabled:opacity-50">
                {saving ? 'Saving…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteAssignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Assignment</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">This will delete the assignment and all its submissions permanently.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteAssignId(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleDeleteAssignment} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {plagiarismModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Plagiarism Report</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{plagiarismModal.student.name}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{plagiarismModal.plagiarismReport ?? 'No details available'}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPlagiarismModal(null)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Close</button>
              <button onClick={() => handleDismissPlagiarism(plagiarismModal)} className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">Dismiss Flag</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

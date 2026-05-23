import { useEffect, useState } from 'react'
import api from '../api/client'

interface Assignment {
  id: string
  title: string
  description: string | null
  date: string
  totalMarks: number
  weight: number
  score: number | null
}

interface Props {
  studentId: string
  studentName: string
  classroomId: string
  onClose: () => void
}

export default function QuickGradeModal({ studentId, studentName, classroomId, onClose }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', description: '', totalMarks: '100', score: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    api.get(`/external-grades/classroom/${classroomId}`).then(r => {
      const raw = r.data as { id: string; title: string; description: string | null; date: string; totalMarks: number; externalGrades: { studentId: string; score: number | null }[] }[]
      setAssignments(raw.map(a => ({
        id: a.id, title: a.title, description: a.description, date: a.date, totalMarks: a.totalMarks, weight: (a as any).weight ?? 0,
        score: a.externalGrades.find(g => g.studentId === studentId)?.score ?? null,
      })))
      setLoading(false)
    })
  }, [classroomId, studentId])

  async function saveScore(assignmentId: string, score: number | null) {
    await api.put(`/external-grades/assignments/${assignmentId}/grades/${studentId}`, { score })
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, score } : a))
  }

  async function createAndGrade(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const { data: newA } = await api.post(`/external-grades/classroom/${classroomId}/assignments`, {
        title: newForm.title,
        description: newForm.description || null,
        date: today,
        totalMarks: Number(newForm.totalMarks) || 100,
      })
      const score = newForm.score !== '' ? Math.min(Number(newForm.totalMarks) || 100, Math.max(0, Number(newForm.score))) : null
      if (score !== null) {
        await api.put(`/external-grades/assignments/${newA.id}/grades/${studentId}`, { score })
      }
      setAssignments(prev => [...prev, { id: newA.id, title: newA.title, description: newA.description, date: newA.date, totalMarks: newA.totalMarks, weight: newA.weight ?? 0, score }])
      setNewForm({ title: '', description: '', totalMarks: '100', score: '' })
      setShowNew(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">Grades — {studentName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Make-ups, extra credit, or any custom assignment score.</p>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
          ) : assignments.length === 0 && !showNew ? (
            <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              No assignments yet. Use the button below to add one.
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {assignments.map(a => {
                const pct = a.score !== null ? Math.round((a.score / a.totalMarks) * 1000) / 10 : null
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.title}</p>
                        {a.weight > 0 && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-medium shrink-0">{a.weight}%</span>
                        )}
                      </div>
                      {a.description && <p className="text-xs text-gray-400 truncate">{a.description}</p>}
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
                          saveScore(a.id, v)
                        }}
                        placeholder="—"
                        className="w-16 text-center text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-1 py-1.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      {pct !== null && (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-12 text-right">{pct}%</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {showNew && (
            <form onSubmit={createAndGrade} className="border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-900/10 space-y-2 mb-2">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">New assignment</p>
              <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} required
                placeholder="Title (e.g. Make-up Quiz)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Score</label>
                  <input type="number" value={newForm.score} onChange={e => setNewForm(f => ({ ...f, score: e.target.value }))}
                    min={0} max={Number(newForm.totalMarks) || 100} placeholder="—"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Out of</label>
                  <input type="number" value={newForm.totalMarks} onChange={e => setNewForm(f => ({ ...f, totalMarks: e.target.value }))}
                    min={1} required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400">Cancel</button>
                <button type="submit" disabled={creating} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {creating ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-2">
          {!showNew && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Add assignment
            </button>
          )}
          <button onClick={onClose} className="ml-auto px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

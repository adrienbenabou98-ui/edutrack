import { useEffect, useRef, useState } from 'react'
import type { Boundary } from '../store/gradeBoundary.store'
import GradeCell from './GradeCell'
import api from '../api/client'

interface Student { id: string; name: string }

interface ExternalAssignment {
  id: string
  title: string
  date: string
  totalMarks: number
  weight: number
  externalGrades: { studentId: string; score: number | null }[]
}

interface Props {
  classroomId: string
  students: Student[]
  boundaries: Boundary[]
}

interface AddModalState { title: string; description: string; date: string; totalMarks: string; weight: string }

const CURVE_TYPES = [
  { value: 'flat', label: 'Flat add', hasValue: true },
  { value: 'multiplier', label: 'Multiplier', hasValue: true },
  { value: 'sqrt', label: 'Square root', hasValue: false },
  { value: 'scale_max', label: 'Scale to max', hasValue: false },
] as const

export default function ExternalGradesSection({ classroomId, students, boundaries }: Props) {
  const [assignments, setAssignments] = useState<ExternalAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [addForm, setAddForm] = useState<AddModalState>({ title: '', description: '', date: new Date().toISOString().slice(0, 10), totalMarks: '100', weight: '0' })
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [curveFor, setCurveFor] = useState<string | null>(null)
  const [curveType, setCurveType] = useState<'flat' | 'multiplier' | 'sqrt' | 'scale_max'>('flat')
  const [curveValue, setCurveValue] = useState('5')
  const [applying, setApplying] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get(`/external-grades/classroom/${classroomId}`)
      .then(r => setAssignments(r.data))
      .finally(() => setLoading(false))
  }, [classroomId])

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function gradeForStudent(a: ExternalAssignment, studentId: string): number | null {
    return a.externalGrades.find(g => g.studentId === studentId)?.score ?? null
  }

  function pct(score: number | null, total: number): number | null {
    if (score === null) return null
    return Math.round((score / total) * 1000) / 10
  }

  function weightedAvgForStudent(studentId: string): number | null {
    const weighted = assignments
      .filter(a => a.weight > 0)
      .flatMap(a => {
        const p = pct(gradeForStudent(a, studentId), a.totalMarks)
        return p !== null ? [{ score: p, weight: a.weight }] : []
      })
    if (weighted.length === 0) return null
    const totalW = weighted.reduce((s, g) => s + g.weight, 0)
    return Math.round(weighted.reduce((s, g) => s + g.score * g.weight, 0) / totalW * 10) / 10
  }

  const totalWeight = assignments.reduce((s, a) => s + a.weight, 0)
  const weightOverflow = totalWeight > 100

  async function saveGrade(assignmentId: string, studentId: string, rawValue: number | null) {
    await api.put(`/external-grades/assignments/${assignmentId}/grades/${studentId}`, { score: rawValue })
    setAssignments(as => as.map(a => a.id !== assignmentId ? a : {
      ...a,
      externalGrades: [
        ...a.externalGrades.filter(g => g.studentId !== studentId),
        { studentId, score: rawValue },
      ],
    }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      title: addForm.title, description: addForm.description, date: addForm.date,
      totalMarks: Number(addForm.totalMarks), weight: Number(addForm.weight) || 0,
    }
    if (editId) {
      const { data } = await api.put(`/external-grades/assignments/${editId}`, payload)
      setAssignments(as => as.map(a => a.id === editId ? { ...data } : a))
    } else {
      const { data } = await api.post(`/external-grades/classroom/${classroomId}/assignments`, payload)
      setAssignments(as => [...as, data])
    }
    setShowAdd(false)
    setEditId(null)
    setAddForm({ title: '', description: '', date: new Date().toISOString().slice(0, 10), totalMarks: '100', weight: '0' })
  }

  async function deleteAssignment(id: string) {
    await api.delete(`/external-grades/assignments/${id}`)
    setAssignments(as => as.filter(a => a.id !== id))
    setMenuOpen(null)
  }

  async function applyCurve() {
    if (!curveFor) return
    setApplying(true)
    try {
      const { data } = await api.post(`/external-grades/assignments/${curveFor}/curve`, {
        curveType, value: ['flat', 'multiplier'].includes(curveType) ? Number(curveValue) : null,
      })
      setAssignments(as => as.map(a => a.id === curveFor ? { ...data } : a))
      setCurveFor(null)
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading grades…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Assignment Grades</h2>
        <div className="flex items-center gap-3">
          {assignments.length > 0 && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${weightOverflow ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : totalWeight > 0 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
              {totalWeight}% of grade weighted{weightOverflow ? ' — over 100%!' : ''}
            </span>
          )}
          <button
            onClick={() => { setShowAdd(true); setEditId(null); setAddForm({ title: '', description: '', date: new Date().toISOString().slice(0, 10), totalMarks: '100', weight: '0' }) }}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >+ Add Assignment</button>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          No external assignments yet. Click "Add Assignment" to record grades.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide w-36 sticky left-0 bg-gray-50 dark:bg-gray-800">Student</th>
                {assignments.map(a => (
                  <th key={a.id} className="px-2 py-3 text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight text-center max-w-[100px]">{a.title}</span>
                        <div className="relative" ref={menuOpen === a.id ? menuRef : undefined}>
                          <button onClick={() => setMenuOpen(menuOpen === a.id ? null : a.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs leading-none">⋯</button>
                          {menuOpen === a.id && (
                            <div className="absolute right-0 top-5 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-36 py-1">
                              <button onClick={() => { setEditId(a.id); setAddForm({ title: a.title, description: (a as any).description ?? '', date: a.date.slice(0, 10), totalMarks: String(a.totalMarks), weight: String(a.weight ?? 0) }); setShowAdd(true); setMenuOpen(null) }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Edit</button>
                              <button onClick={() => { setCurveFor(a.id); setMenuOpen(null) }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Apply Curve</button>
                              <button onClick={() => deleteAssignment(a.id)}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString()}</span>
                      <span className="text-xs text-gray-400">/{a.totalMarks}</span>
                      {a.weight > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-medium">{a.weight}%</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">Avg</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700/50">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 text-sm">{student.name}</td>
                  {assignments.map(a => {
                    const raw = gradeForStudent(a, student.id)
                    const percent = pct(raw, a.totalMarks)
                    return (
                      <td key={a.id} className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <input
                            type="number"
                            min={0}
                            max={a.totalMarks}
                            value={raw ?? ''}
                            onChange={e => {
                              const v = e.target.value === '' ? null : Math.min(a.totalMarks, Math.max(0, Number(e.target.value)))
                              saveGrade(a.id, student.id, v)
                            }}
                            className="w-16 text-center text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-1 py-1 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="—"
                          />
                          {percent !== null && (
                            <GradeCell value={percent} boundaries={boundaries} readOnly size="sm" />
                          )}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center">
                    <GradeCell value={weightedAvgForStudent(student.id)} boundaries={boundaries} readOnly size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{editId ? 'Edit Assignment' : 'Add Assignment'}</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Essay — Week 3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="What is this assignment about?"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total marks</label>
                  <input type="number" value={addForm.totalMarks} onChange={e => setAddForm(f => ({ ...f, totalMarks: e.target.value }))} min={1} required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight <span className="font-normal text-gray-400">(%)</span></label>
                  <input type="number" value={addForm.weight} onChange={e => setAddForm(f => ({ ...f, weight: e.target.value }))} min={0} max={100} step={5}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Weight = % of overall grade this assignment counts for. 0 = unweighted (excluded from overall).</p>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700">Cancel</button>
                <button type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editId ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Curve modal */}
      {curveFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Apply Curve</h3>
              <button onClick={() => setCurveFor(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              {CURVE_TYPES.map(ct => (
                <label key={ct.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${curveType === ct.value ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
                  <input type="radio" checked={curveType === ct.value} onChange={() => setCurveType(ct.value)} />
                  <span className="text-sm text-gray-900 dark:text-white">{ct.label}</span>
                </label>
              ))}
              {['flat', 'multiplier'].includes(curveType) && (
                <input type="number" value={curveValue} onChange={e => setCurveValue(e.target.value)} step={curveType === 'multiplier' ? '0.1' : '1'}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              )}
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setCurveFor(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white">Cancel</button>
              <button onClick={applyCurve} disabled={applying} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {applying ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

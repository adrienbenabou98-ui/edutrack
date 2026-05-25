import { useEffect, useRef, useState } from 'react'
import type { Boundary } from '../store/gradeBoundary.store'
import { useUnderstandingLevelStore } from '../store/understandingLevel.store'
import type { UnderstandingLevel } from '../store/understandingLevel.store'
import GradeCell from './GradeCell'
import api from '../api/client'

interface Student { id: string; name: string }

interface LessonData {
  id: string; title: string; date: string | null; order: number
  understandings: { studentId: string; understandingLevelId: string | null }[]
}
interface UnitAssessmentData { studentId: string; score: number | null; totalMarks: number }
interface UnitData {
  id: string; name: string; order: number
  lessons: LessonData[]
  unitAssessments: UnitAssessmentData[]
}

interface Props {
  classroomId: string
  students: Student[]
  boundaries: Boundary[]
}

function lessonSummativeColour(
  levelIds: (string | null)[],
  teacherLevels: UnderstandingLevel[],
): { colour: string; label: string } | null {
  const nonAbsent = [...teacherLevels].filter(l => !l.isAbsent).sort((a, b) => a.order - b.order)
  if (nonAbsent.length === 0) return null
  const maxPoints = nonAbsent.length - 1
  const attended = levelIds
    .map(id => id ? teacherLevels.find(l => l.id === id) ?? null : null)
    .filter((l): l is UnderstandingLevel => l !== null && !l.isAbsent)
  if (attended.length === 0) return null
  const points = attended.reduce((s, l) => {
    const idx = nonAbsent.findIndex(nl => nl.id === l.id)
    return s + (idx === -1 ? 0 : maxPoints - idx)
  }, 0)
  const ratio = maxPoints > 0 ? points / (attended.length * maxPoints) : 1
  const midIdx = Math.floor((nonAbsent.length - 1) / 2)
  if (ratio >= 0.75) return { colour: nonAbsent[0].colour, label: nonAbsent[0].label }
  if (ratio >= 0.40) return { colour: nonAbsent[midIdx].colour, label: nonAbsent[midIdx].label }
  return { colour: nonAbsent[nonAbsent.length - 1].colour, label: nonAbsent[nonAbsent.length - 1].label }
}

function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1f2937' : 'white'
}

function LessonCell({
  levelId,
  levels,
  onChange,
}: {
  levelId: string | null
  levels: UnderstandingLevel[]
  onChange: (id: string | null) => void
}) {
  const level = levelId ? levels.find(l => l.id === levelId) : null
  const isDeleted = levelId !== null && !level

  const cycle = [null, ...levels.map(l => l.id)]
  const currentIdx = levelId ? cycle.indexOf(levelId) : 0
  const nextId = cycle[(currentIdx + 1) % cycle.length] ?? null

  const colour = isDeleted ? '#ede9fe' : level ? level.colour : '#e5e7eb'
  const title = isDeleted
    ? 'Deleted level — click to reassign'
    : level
      ? level.label + (level.isAbsent ? ' (absent)' : '')
      : 'Click to set understanding level'

  return (
    <button
      onClick={() => onChange(nextId)}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(nextId) } }}
      title={title}
      className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      style={{ backgroundColor: colour }}
      aria-label={level?.label ?? (isDeleted ? 'Deleted' : 'Not set')}
    />
  )
}

export default function UnitsSection({ classroomId, students, boundaries }: Props) {
  const [units, setUnits] = useState<UnitData[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [editingUnitName, setEditingUnitName] = useState('')
  const [editingLesson, setEditingLesson] = useState<{ unitId: string; lessonId: string } | null>(null)
  const [editingLessonTitle, setEditingLessonTitle] = useState('')
  const pendingRef = useRef<Map<string, AbortController>>(new Map())

  const { levels, loaded: levelsLoaded, load: loadLevels } = useUnderstandingLevelStore()

  useEffect(() => { if (!levelsLoaded) loadLevels() }, [levelsLoaded])

  useEffect(() => {
    api.get(`/units/classroom/${classroomId}`)
      .then(r => { setUnits(r.data); if (r.data.length > 0) setExpanded(new Set([r.data[0].id])) })
      .finally(() => setLoading(false))
  }, [classroomId])

  function toggle(id: string) {
    setExpanded(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function addUnit(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await api.post(`/units/classroom/${classroomId}`, { name: newUnitName })
    setUnits(us => [...us, data])
    setExpanded(s => new Set([...s, data.id]))
    setNewUnitName('')
    setShowAddUnit(false)
  }

  async function deleteUnit(id: string) {
    await api.delete(`/units/${id}`)
    setUnits(us => us.filter(u => u.id !== id))
  }

  async function saveUnitName(id: string, name: string) {
    const { data } = await api.put(`/units/${id}`, { name })
    setUnits(us => us.map(u => u.id === id ? { ...u, name: data.name } : u))
    setEditingUnitId(null)
  }

  async function addLesson(unitId: string) {
    const unit = units.find(u => u.id === unitId)!
    const { data } = await api.post(`/units/${unitId}/lessons`, { title: `Lesson ${unit.lessons.length + 1}` })
    setUnits(us => us.map(u => u.id === unitId ? { ...u, lessons: [...u.lessons, data] } : u))
  }

  async function saveLessonTitle(unitId: string, lessonId: string, title: string) {
    await api.put(`/units/lessons/${lessonId}`, { title })
    setUnits(us => us.map(u => u.id !== unitId ? u : {
      ...u, lessons: u.lessons.map(l => l.id === lessonId ? { ...l, title } : l),
    }))
    setEditingLesson(null)
  }

  async function deleteLesson(unitId: string, lessonId: string) {
    await api.delete(`/units/lessons/${lessonId}`)
    setUnits(us => us.map(u => u.id !== unitId ? u : { ...u, lessons: u.lessons.filter(l => l.id !== lessonId) }))
  }

  function setUnderstandingOptimistic(unitId: string, lessonId: string, studentId: string, levelId: string | null) {
    const key = `${lessonId}-${studentId}`
    const prev = units.find(u => u.id === unitId)?.lessons.find(l => l.id === lessonId)
      ?.understandings.find(u => u.studentId === studentId)?.understandingLevelId ?? null

    setUnits(us => us.map(u => u.id !== unitId ? u : {
      ...u,
      lessons: u.lessons.map(l => l.id !== lessonId ? l : {
        ...l,
        understandings: levelId === null
          ? l.understandings.filter(u => u.studentId !== studentId)
          : [
            ...l.understandings.filter(u => u.studentId !== studentId),
            { studentId, understandingLevelId: levelId },
          ],
      }),
    }))

    pendingRef.current.get(key)?.abort()
    const ctrl = new AbortController()
    pendingRef.current.set(key, ctrl)

    api.put(`/units/lessons/${lessonId}/understanding/${studentId}`, { understandingLevelId: levelId }, { signal: ctrl.signal })
      .catch((err) => {
        if (err.name === 'CanceledError') return
        setUnits(us => us.map(u => u.id !== unitId ? u : {
          ...u,
          lessons: u.lessons.map(l => l.id !== lessonId ? l : {
            ...l,
            understandings: prev === null
              ? l.understandings.filter(u => u.studentId !== studentId)
              : [...l.understandings.filter(u => u.studentId !== studentId), { studentId, understandingLevelId: prev }],
          }),
        }))
      })
  }

  async function saveAssessment(unitId: string, studentId: string, score: number | null, totalMarks: number) {
    await api.put(`/units/${unitId}/assessment/${studentId}`, { score, totalMarks })
    setUnits(us => us.map(u => u.id !== unitId ? u : {
      ...u,
      unitAssessments: [
        ...u.unitAssessments.filter(a => a.studentId !== studentId),
        { studentId, score, totalMarks },
      ],
    }))
  }

  if (loading || !levelsLoaded) return <div className="text-sm text-gray-400 py-4">Loading units…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Units</h2>
        <button onClick={() => setShowAddUnit(true)} className="btn-3d-indigo px-3 py-1.5">+ Add Unit</button>
      </div>

      {showAddUnit && (
        <form onSubmit={addUnit} className="mb-4 flex gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <input autoFocus value={newUnitName} onChange={e => setNewUnitName(e.target.value)} required
            placeholder="Unit name (e.g. Fractions)"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" className="btn-3d-indigo">Create</button>
          <button type="button" onClick={() => setShowAddUnit(false)} className="text-gray-500 px-3 text-sm">Cancel</button>
        </form>
      )}

      {units.length === 0 && !showAddUnit && (
        <div className="text-center py-8 text-gray-400 text-sm bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          No units yet. Click "Add Unit" to create your first unit.
        </div>
      )}

      <div className="space-y-3">
        {units.map(unit => {
          const isOpen = expanded.has(unit.id)
          return (
            <div key={unit.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <button onClick={() => toggle(unit.id)} className="flex-1 flex items-center gap-3 text-left">
                  {editingUnitId === unit.id ? (
                    <input
                      autoFocus
                      value={editingUnitName}
                      onChange={e => setEditingUnitName(e.target.value)}
                      onBlur={() => saveUnitName(unit.id, editingUnitName)}
                      onKeyDown={e => { if (e.key === 'Enter') saveUnitName(unit.id, editingUnitName) }}
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-semibold border-b border-indigo-400 bg-transparent text-gray-900 dark:text-white focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{unit.name}</span>
                  )}
                  <span className="text-xs text-gray-400">{unit.lessons.length} lessons</span>
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingUnitId(unit.id); setEditingUnitName(unit.name) }}
                    className="text-xs text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1">Edit</button>
                  <button onClick={() => deleteUnit(unit.id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Delete</button>
                  <span className="text-gray-400 text-sm cursor-pointer" onClick={() => toggle(unit.id)}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50">
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 w-36 sticky left-0 bg-gray-50 dark:bg-gray-700/50">Student</th>
                          {unit.lessons.map(lesson => (
                            <th key={lesson.id} className="px-2 py-2 text-center min-w-[90px]">
                              <div className="flex flex-col items-center gap-1">
                                {editingLesson?.lessonId === lesson.id && editingLesson.unitId === unit.id ? (
                                  <input
                                    autoFocus
                                    value={editingLessonTitle}
                                    onChange={e => setEditingLessonTitle(e.target.value)}
                                    onBlur={() => saveLessonTitle(unit.id, lesson.id, editingLessonTitle)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveLessonTitle(unit.id, lesson.id, editingLessonTitle) }}
                                    className="text-xs font-medium border-b border-indigo-400 bg-transparent text-gray-700 dark:text-gray-300 w-20 text-center focus:outline-none"
                                  />
                                ) : (
                                  <button onClick={() => { setEditingLesson({ unitId: unit.id, lessonId: lesson.id }); setEditingLessonTitle(lesson.title) }}
                                    className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 max-w-[80px] truncate">
                                    {lesson.title}
                                  </button>
                                )}
                                <input
                                  type="date"
                                  defaultValue={lesson.date?.slice(0, 10) ?? ''}
                                  onBlur={e => api.put(`/units/lessons/${lesson.id}`, { date: e.target.value || null })}
                                  className="text-xs text-gray-400 bg-transparent border-none w-[100px] focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
                                />
                                <button onClick={() => deleteLesson(unit.id, lesson.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                              </div>
                            </th>
                          ))}
                          <th className="px-2 py-2 text-center">
                            <button onClick={() => addLesson(unit.id)} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium border border-dashed border-indigo-300 rounded px-2 py-0.5">+ Lesson</button>
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 whitespace-nowrap">Summary</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700/50">
                        {students.map(student => {
                          const levelIds = unit.lessons.map(l => {
                            const u = l.understandings.find(u => u.studentId === student.id)
                            return u?.understandingLevelId ?? null
                          })
                          const summative = lessonSummativeColour(levelIds, levels)
                          return (
                            <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 text-sm">{student.name}</td>
                              {unit.lessons.map((lesson, li) => (
                                <td key={lesson.id} className="px-2 py-3 text-center">
                                  <div className="flex justify-center">
                                    <LessonCell
                                      levelId={levelIds[li]}
                                      levels={levels}
                                      onChange={id => setUnderstandingOptimistic(unit.id, lesson.id, student.id, id)}
                                    />
                                  </div>
                                </td>
                              ))}
                              <td className="px-2 py-3 text-center" />
                              <td className="px-3 py-3 text-center">
                                {summative ? (
                                  <span
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                                    style={{ backgroundColor: summative.colour, color: contrastText(summative.colour) }}
                                    title={summative.label}
                                  />
                                ) : (
                                  <span className="text-gray-400 text-sm" title="No attended lessons">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  {levels.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-50 dark:border-gray-700/50 flex flex-wrap gap-x-4 gap-y-1">
                      {levels.map(l => (
                        <span key={l.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <span className="w-3 h-3 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: l.colour }} />
                          {l.label}{l.isAbsent ? ' (absent)' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* End of Unit Assessment */}
                  <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 bg-gray-50/50 dark:bg-gray-700/20">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">End Assessment</p>
                    <div className="flex flex-wrap gap-4">
                      {students.map(student => {
                        const a = unit.unitAssessments.find(a => a.studentId === student.id)
                        const totalMarks = a?.totalMarks ?? 100
                        const score = a?.score ?? null
                        const pct = score !== null ? Math.round((score / totalMarks) * 1000) / 10 : null
                        return (
                          <div key={student.id} className="flex flex-col items-start gap-1 min-w-[120px]">
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{student.name}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number" min={0} max={totalMarks} value={score ?? ''}
                                onChange={e => {
                                  const v = e.target.value === '' ? null : Math.min(totalMarks, Math.max(0, Number(e.target.value)))
                                  saveAssessment(unit.id, student.id, v, totalMarks)
                                }}
                                className="w-14 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-center bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                placeholder="—"
                              />
                              <span className="text-xs text-gray-400">/{totalMarks}</span>
                              {pct !== null && <GradeCell value={pct} boundaries={boundaries} readOnly size="sm" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

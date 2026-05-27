import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import DarkModeToggle from '../../components/DarkModeToggle'
import NotificationBell from '../../components/NotificationBell'
import NavStudentsIcon from '../../components/NavStudentsIcon'
import api from '../../api/client'

const STAGES = ['MONITORING', 'CONTACTED', 'IMPROVING', 'RESOLVED'] as const
type Stage = typeof STAGES[number]

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string; dot: string }> = {
  MONITORING: { label: 'Monitoring', color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700', dot: 'bg-amber-400' },
  CONTACTED:  { label: 'Contacted',  color: 'text-blue-700',  bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',   dot: 'bg-blue-400' },
  IMPROVING:  { label: 'Improving',  color: 'text-teal-700',  bg: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700',   dot: 'bg-teal-400' },
  RESOLVED:   { label: 'Resolved',   color: 'text-gray-500',  bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',       dot: 'bg-gray-400' },
}

const NAV = 'flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'

interface Intervention {
  id: string; studentId: string; classroomId: string; stage: Stage; notes: string | null
  student: { id: string; name: string }
  classroom: { id: string; name: string }
}

export default function Interventions() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [editing, setEditing] = useState<Intervention | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/students/interventions/all').then(r => { setInterventions(r.data); setLoading(false) })
  }, [])

  async function moveStage(item: Intervention, stage: Stage) {
    const { data } = await api.put(`/students/${item.studentId}/interventions/${item.classroomId}`, { stage })
    setInterventions(is => is.map(i => i.id === item.id ? { ...i, stage: data.stage } : i))
  }

  async function saveNotes() {
    if (!editing) return
    const { data } = await api.put(`/students/${editing.studentId}/interventions/${editing.classroomId}`, { notes: editNotes })
    setInterventions(is => is.map(i => i.id === editing.id ? { ...i, notes: data.notes } : i))
    setEditing(null)
  }

  async function dismiss(item: Intervention) {
    await api.delete(`/students/${item.studentId}/interventions/${item.classroomId}`)
    setInterventions(is => is.filter(i => i.id !== item.id))
  }

  const byStage = (stage: Stage) => interventions.filter(i => i.stage === stage)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TeacherNav activePage="interventions" />


      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Intervention Pipeline</h1>
        {loading ? <div className="text-center py-16 text-gray-400">Loading…</div> : (
          <div className="grid grid-cols-4 gap-4">
            {STAGES.map(stage => {
              const cfg = STAGE_CONFIG[stage]
              const items = byStage(stage)
              return (
                <div key={stage} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="ml-auto text-xs text-gray-400">{items.length}</span>
                  </div>
                  <div className="p-3 space-y-2 min-h-[120px]">
                    {items.map(item => (
                      <div key={item.id} className={`rounded-lg border p-3 ${cfg.bg}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.student.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.classroom.name}</p>
                            {item.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{item.notes}</p>}
                          </div>
                          <button onClick={() => { setEditing(item); setEditNotes(item.notes ?? '') }} className="text-gray-400 hover:text-gray-600 text-sm shrink-0">✎</button>
                        </div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {STAGES.filter(s => s !== stage).map(s => (
                            <button key={s} onClick={() => moveStage(item, s)} className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 hover:border-gray-400 transition-colors">→ {STAGE_CONFIG[s].label}</button>
                          ))}
                          <button onClick={() => dismiss(item)} className="text-[10px] text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded border border-red-100 hover:border-red-300 transition-colors ml-auto">Remove</button>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">None</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {interventions.length === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm mt-4">Students flagged as at-risk in your classrooms will appear here. Visit a classroom's At-Risk tab to add them.</p>
        )}
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Notes — {editing.student.name}</h2>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Add intervention notes…" />
            <div className="flex gap-3 mt-4">
              <button onClick={saveNotes} className="btn-3d-indigo text-sm">Save</button>
              <button onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

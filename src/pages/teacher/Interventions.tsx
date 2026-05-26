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
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <Link to="/teacher" className="text-lg font-semibold text-indigo-700">EduTrack</Link>
        <div className="flex items-center gap-4">
          <Link to="/teacher/grades" className={NAV}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>Grade Tracker</Link>
          <Link to="/messages" className={NAV}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>Messages</Link>
          <NavStudentsIcon />
          <Link to="/teacher/rubrics" className={NAV}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>Rubrics</Link>
          <Link to="/teacher/templates" className={NAV}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>Templates</Link>
          <Link to="/teacher/planner" className={NAV}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>Planner</Link>
          <Link to="/teacher/interventions" className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg>Interventions</Link>
          <Link to="/teacher/assignments" className={NAV}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" /></svg>Assignments</Link>
          <Link to="/teacher/rankings" className={NAV}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" /></svg>Rankings</Link>
          <Link to="/teacher/settings" className={NAV}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>Settings</Link>
          <NotificationBell accent="indigo" />
          <DarkModeToggle />
          <span className="text-sm text-gray-600 dark:text-gray-300">{user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </nav>

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

import { useEffect, useState } from 'react'
import TeacherNav from '../../components/TeacherNav'
import api from '../../api/client'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIODS = [1, 2, 3, 4, 5, 6]
const COLORS = ['#6366f1', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981']
interface Plan { id: string; dayOfWeek: number; period: number; topic: string; notes: string | null; color: string; classroom: { id: string; name: string } | null }
interface Classroom { id: string; name: string }

function getMonday(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export default function LessonPlanner() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [plans, setPlans] = useState<Plan[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [editing, setEditing] = useState<{ day: number; period: number; plan?: Plan } | null>(null)
  const [form, setForm] = useState({ topic: '', notes: '', color: COLORS[0], classroomId: '' })

  useEffect(() => { api.get('/classrooms').then(r => setClassrooms(r.data)) }, [])

  useEffect(() => {
    api.get(`/lesson-plans?weekStart=${weekStart.toISOString()}`).then(r => setPlans(r.data))
  }, [weekStart])

  function getPlan(day: number, period: number) {
    return plans.find(p => p.dayOfWeek === day && p.period === period)
  }

  function openCell(day: number, period: number) {
    const plan = getPlan(day, period)
    setForm({ topic: plan?.topic ?? '', notes: plan?.notes ?? '', color: plan?.color ?? COLORS[0], classroomId: plan?.classroom?.id ?? '' })
    setEditing({ day, period, plan })
  }

  async function save() {
    if (!form.topic.trim() || !editing) return
    const payload = {
      id: editing.plan?.id,
      weekStart: weekStart.toISOString(),
      dayOfWeek: editing.day,
      period: editing.period,
      topic: form.topic,
      notes: form.notes || null,
      color: form.color,
      classroomId: form.classroomId || null,
    }
    const { data } = await api.post('/lesson-plans', payload)
    setPlans(ps => {
      const filtered = ps.filter(p => !(p.dayOfWeek === editing.day && p.period === editing.period))
      return [...filtered, data]
    })
    setEditing(null)
  }

  async function deletePlan() {
    if (!editing?.plan) return
    await api.delete(`/lesson-plans/${editing.plan.id}`)
    setPlans(ps => ps.filter(p => p.id !== editing.plan!.id))
    setEditing(null)
  }

  function shiftWeek(n: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + n * 7)
    setWeekStart(d)
  }

  const weekLabel = `${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(weekStart.getTime() + 4 * 86400000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TeacherNav activePage="planner" />


      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Lesson Planner</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => shiftWeek(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">‹</button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-52 text-center">{weekLabel}</span>
            <button onClick={() => shiftWeek(1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">›</button>
            <button onClick={() => setWeekStart(getMonday(new Date()))} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 hover:border-indigo-400 transition-colors">This week</button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="grid grid-cols-6 border-b border-gray-200 dark:border-gray-700">
            <div className="px-3 py-2 text-xs font-medium text-gray-400 border-r border-gray-200 dark:border-gray-700">Period</div>
            {DAYS.map(d => <div key={d} className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0">{d}</div>)}
          </div>
          {PERIODS.map(period => (
            <div key={period} className="grid grid-cols-6 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="px-3 py-3 text-xs font-medium text-gray-400 border-r border-gray-200 dark:border-gray-700 flex items-center">{period}</div>
              {DAYS.map((_, di) => {
                const plan = getPlan(di, period)
                return (
                  <div key={di} onClick={() => openCell(di, period)} className="px-2 py-2 border-r border-gray-100 dark:border-gray-700 last:border-r-0 min-h-[56px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    {plan ? (
                      <div className="rounded-md px-2 py-1.5 text-white text-xs leading-tight" style={{ backgroundColor: plan.color }}>
                        <div className="font-medium truncate">{plan.topic}</div>
                        {plan.classroom && <div className="opacity-80 text-[10px] truncate mt-0.5">{plan.classroom.name}</div>}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-gray-400 text-xs">+</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{DAYS[editing.day]} · Period {editing.period}</h2>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Topic</label><input autoFocus value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Class (optional)</label><select value={form.classroomId} onChange={e => setForm(f => ({ ...f, classroomId: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="">None</option>{classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Notes (optional)</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Colour</label><div className="flex gap-2 flex-wrap">{COLORS.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ backgroundColor: c }} />)}</div></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={save} className="btn-3d-indigo text-sm">Save</button>
              {editing.plan && <button onClick={deletePlan} className="text-sm text-red-500 hover:text-red-700 px-3">Delete</button>}
              <button onClick={() => setEditing(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

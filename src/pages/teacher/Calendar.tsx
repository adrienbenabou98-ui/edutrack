import { useEffect, useState } from 'react'
import TeacherNav from '../../components/TeacherNav'
import GoogleCalendarConnect from '../../components/GoogleCalendarConnect'
import api from '../../api/client'

interface Assignment {
  id: string
  title: string
  dueDate: string | null
  classroom: { name: string }
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function buildCalendar(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function TeacherCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<number | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    api.get('/assignments/all').then(r => setAssignments(r.data)).catch(() => {})
  }, [])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelected(null)
  }

  const cells = buildCalendar(year, month)

  function forDay(day: number) {
    return assignments.filter(a => {
      if (!a.dueDate) return false
      const d = new Date(a.dueDate)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const selectedList = selected ? forDay(selected) : []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TeacherNav activePage="calendar" />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {MONTH_NAMES[month]} {year}
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(null) }}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Today
              </button>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-16 border-t border-gray-100 dark:border-gray-700/50" />
              const dayAssignments = forDay(day)
              const todayDay = isToday(day)
              const isSelected = selected === day
              return (
                <button
                  key={i}
                  onClick={() => setSelected(isSelected ? null : day)}
                  className={`h-16 border-t border-gray-100 dark:border-gray-700/50 flex flex-col items-center pt-2 gap-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center text-sm rounded-full leading-none font-medium ${todayDay ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day}
                  </span>
                  {dayAssignments.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center px-1">
                      {dayAssignments.slice(0, 3).map((_, idx) => (
                        <span key={idx} className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                      ))}
                      {dayAssignments.length > 3 && <span className="text-[9px] text-indigo-400">+{dayAssignments.length - 3}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {selected && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {MONTH_NAMES[month]} {selected}
            </h2>
            {selectedList.length === 0 ? (
              <p className="text-sm text-gray-400">No assignments due this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedList.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.classroom.name}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">Due</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Google Calendar</h2>
            <p className="text-sm text-gray-400 mt-1">Sync assignment due dates to your Google Calendar.</p>
          </div>
          <GoogleCalendarConnect />
        </div>
      </main>
    </div>
  )
}

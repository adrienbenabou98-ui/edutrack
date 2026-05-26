import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import DarkModeToggle from '../../components/DarkModeToggle'
import NotificationBell from '../../components/NotificationBell'
import GoogleCalendarConnect from '../../components/GoogleCalendarConnect'
import api from '../../api/client'

interface Assignment {
  id: string
  title: string
  dueDate: string | null
  classroom: { name: string }
  submissions: { id: string }[]
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const NAV_CLS = "flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"

function buildCalendar(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function StudentCalendar() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<number | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    api.get('/assignments/my').then(r => setAssignments(r.data)).catch(() => {})
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
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <Link to="/student" className="text-lg font-semibold text-teal-700 dark:text-teal-400">EduTrack</Link>
        <div className="flex items-center gap-4">
          <Link to="/student/assignments" className={NAV_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
            Assignments
          </Link>
          <Link to="/student/rankings" className={NAV_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
            </svg>
            Rankings
          </Link>
          <Link to="/student/progress" className={NAV_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            My Progress
          </Link>
          <Link to="/student/calendar" className="flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            Calendar
          </Link>
          <Link to="/messages" className={NAV_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Messages
          </Link>
          <NotificationBell accent="teal" />
          <DarkModeToggle />
          <Link to="/student/settings" className={NAV_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Settings
          </Link>
          <span className="text-sm text-gray-600 dark:text-gray-300">{user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Sign out</button>
        </div>
      </nav>

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
                  className={`h-16 border-t border-gray-100 dark:border-gray-700/50 flex flex-col items-center pt-2 gap-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center text-sm rounded-full leading-none font-medium ${todayDay ? 'bg-teal-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day}
                  </span>
                  {dayAssignments.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center px-1">
                      {dayAssignments.slice(0, 3).map((_, idx) => (
                        <span key={idx} className="w-1.5 h-1.5 rounded-full bg-teal-400 dark:bg-teal-500" />
                      ))}
                      {dayAssignments.length > 3 && <span className="text-[9px] text-teal-400">+{dayAssignments.length - 3}</span>}
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
                  <Link
                    key={a.id}
                    to={a.submissions.length === 0 ? `/student/assignment/${a.id}` : '#'}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:opacity-80 transition-opacity"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.classroom.name}</p>
                    </div>
                    {a.submissions.length === 0
                      ? <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">Due</span>
                      : <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium">Submitted</span>
                    }
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Google Calendar</h2>
            <p className="text-sm text-gray-400 mt-1">Sync your assignment due dates to Google Calendar.</p>
          </div>
          <GoogleCalendarConnect />
        </div>
      </main>
    </div>
  )
}

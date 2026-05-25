import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTermStore } from '../store/term.store'

function weekNumber(startDate: string): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = today.getTime() - start.getTime()
  return Math.max(1, Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7))
}

function withinTerm(term: { startDate: string; endDate: string }): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(term.startDate); start.setHours(0, 0, 0, 0)
  const end = new Date(term.endDate); end.setHours(23, 59, 59, 999)
  return today >= start && today <= end
}

export default function TermIndicator() {
  const { activeTerm, loaded, load, lastAutoSwitchMessage, clearMessage } = useTermStore()

  useEffect(() => { if (!loaded) load() }, [loaded])

  useEffect(() => {
    if (lastAutoSwitchMessage) {
      const t = setTimeout(clearMessage, 5000)
      return () => clearTimeout(t)
    }
  }, [lastAutoSwitchMessage])

  if (!loaded) return null

  if (!activeTerm) {
    return (
      <Link to="/teacher/settings" className="text-xs text-gray-400 hover:text-indigo-500 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1">
        No Term Set
      </Link>
    )
  }

  const inside = withinTerm(activeTerm)
  const week = inside ? weekNumber(activeTerm.startDate) : null

  return (
    <div className="relative flex items-center">
      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg px-2.5 py-1 select-none">
        {inside && week !== null ? `${activeTerm.name} — Week ${week}` : 'Between Terms'}
      </span>
      {lastAutoSwitchMessage && (
        <div className="absolute right-0 top-8 z-50 bg-gray-900 text-white text-xs rounded-full px-3 py-1.5 shadow-md whitespace-nowrap">
          {lastAutoSwitchMessage}
        </div>
      )}
    </div>
  )
}

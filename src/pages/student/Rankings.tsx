import { useEffect, useState } from 'react'
import StudentNav from '../../components/StudentNav'
import api from '../../api/client'

interface LeaderboardEntry {
  studentId: string; name: string; points: number; rank: number; isCurrentUser: boolean
}
interface Classroom {
  id: string; name: string; classCode: string
}

const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function StudentRankings() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/classrooms').then(async r => {
      setClassrooms(r.data)
      const results = await Promise.allSettled(
        r.data.map((c: Classroom) => api.get(`/classrooms/${c.id}/leaderboard`))
      )
      const map: Record<string, LeaderboardEntry[]> = {}
      r.data.forEach((c: Classroom, i: number) => {
        const res = results[i]
        if (res.status === 'fulfilled') map[c.id] = res.value.data
      })
      setLeaderboards(map)
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentNav activePage="rankings" />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Rankings</h1>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-400">No classes yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {classrooms.map(c => {
              const lb = leaderboards[c.id] ?? []
              return (
                <div key={c.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">{c.name}</h2>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{c.classCode}</p>
                  </div>
                  {lb.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-gray-400">No rankings yet — submit assignments to earn points.</div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {lb.map(entry => (
                        <div
                          key={entry.studentId}
                          className={`flex items-center justify-between px-5 py-3 ${entry.isCurrentUser ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 text-center text-sm font-semibold text-gray-400">
                              {medals[entry.rank] ?? `#${entry.rank}`}
                            </span>
                            <span className={`text-sm font-medium ${entry.isCurrentUser ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300'}`}>
                              {entry.isCurrentUser ? 'You' : entry.name}
                              {entry.isCurrentUser && <span className="ml-1.5 text-[10px] text-teal-500 font-semibold uppercase tracking-wide">You</span>}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 tabular-nums">{entry.points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

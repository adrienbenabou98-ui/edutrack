interface LeaderboardEntry {
  studentId: string
  name: string
  points: number
  rank: number
  isCurrentUser: boolean
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function LeaderboardTab({
  entries,
  isTeacher = false,
}: {
  entries: LeaderboardEntry[]
  isTeacher?: boolean
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <p className="text-gray-400">No leaderboard data yet</p>
        <p className="text-sm text-gray-400 mt-1">Points are earned when assignments are graded</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Class Leaderboard</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Points for on-time submissions and high scores</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {entries.map(entry => (
          <div
            key={entry.studentId}
            className={`flex items-center gap-4 px-5 py-3 ${entry.isCurrentUser ? 'bg-teal-50 dark:bg-teal-900/10' : ''}`}
          >
            <div className="w-8 text-center shrink-0">
              {MEDAL[entry.rank] ? (
                <span className="text-lg">{MEDAL[entry.rank]}</span>
              ) : (
                <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">#{entry.rank}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${entry.isCurrentUser ? 'text-teal-700 dark:text-teal-400' : 'text-gray-900 dark:text-white'}`}>
                {isTeacher ? entry.name : (entry.isCurrentUser ? `${entry.name} (You)` : `Student #${entry.rank}`)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{entry.points}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AdminLayout from './AdminLayout'
import api from '../../api/client'

interface Stats {
  userCounts: { role: string; _count: { id: number } }[]
  classroomCount: number
  assignmentCount: number
  submissionCount: number
  gradedCount: number
  avgScore: number
  recentUsers: { id: string; name: string; email: string | null; role: string; createdAt: string }[]
  topClassrooms: {
    id: string; name: string
    teacher: { name: string }
    _count: { enrollments: number; assignments: number; messages: number }
  }[]
}

interface Usage {
  classroomActivity: { id: string; name: string; teacher: { name: string }; _count: { enrollments: number; assignments: number } }[]
  teacherStats: { id: string; name: string; email: string | null; classrooms: number; totalStudents: number; totalAssignments: number; lastLogin: string | null }[]
}

function timeAgo(date: string | null) {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/admin/analytics/stats'), api.get('/admin/analytics/usage')]).then(([s, u]) => {
      setStats(s.data)
      setUsage(u.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full py-32">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  const teacherCount  = stats?.userCounts.find(u => u.role === 'TEACHER')?._count.id ?? 0
  const studentCount  = stats?.userCounts.find(u => u.role === 'STUDENT')?._count.id ?? 0
  const gradingRate   = stats && stats.submissionCount > 0 ? Math.round((stats.gradedCount / stats.submissionCount) * 100) : 0

  const barData = usage?.classroomActivity.slice(0, 8).map(c => ({
    name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
    Students: c._count.enrollments,
    Assignments: c._count.assignments,
  })) ?? []

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Platform-wide activity and statistics</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Teachers',    value: teacherCount,                colour: 'text-blue-600 dark:text-blue-400' },
            { label: 'Students',    value: studentCount,                colour: 'text-teal-600 dark:text-teal-400' },
            { label: 'Classrooms',  value: stats?.classroomCount ?? 0,  colour: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Assignments', value: stats?.assignmentCount ?? 0, colour: 'text-gray-900 dark:text-white' },
            { label: 'Submissions', value: stats?.submissionCount ?? 0, colour: 'text-gray-900 dark:text-white' },
            { label: 'Avg Score',   value: `${Math.round(stats?.avgScore ?? 0)}%`, colour: stats && stats.avgScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.colour}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Bar chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Classrooms — Students & Assignments</h2>
            {barData.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Students" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Assignments" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Grading rate */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Grading Progress</h2>
            <div className="flex items-center justify-center h-[220px]">
              <div className="text-center">
                <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">{gradingRate}%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">of submissions graded</div>
                <div className="text-xs text-gray-400 mt-1">{stats?.gradedCount} / {stats?.submissionCount}</div>
                <div className="mt-4 w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto">
                  <div className="h-2 bg-indigo-600 rounded-full transition-all" style={{ width: `${gradingRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent signups */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Signups</h2>
            <div className="space-y-2">
              {(stats?.recentUsers ?? []).map(u => (
                <div key={u.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' : u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>{u.role}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher leaderboard */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Most Active Teachers</h2>
            <div className="space-y-2">
              {(usage?.teacherStats ?? []).slice(0, 5).map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.classrooms} class · {t.totalStudents} students · last login {timeAgo(t.lastLogin)}</p>
                  </div>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{t.totalAssignments} assign.</span>
                </div>
              ))}
              {(usage?.teacherStats ?? []).length === 0 && <p className="text-sm text-gray-400">No teachers yet</p>}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

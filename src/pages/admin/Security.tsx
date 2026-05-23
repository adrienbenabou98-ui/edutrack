import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import api from '../../api/client'

interface AuditLog {
  id: string
  action: string
  target: string | null
  details: any
  createdAt: string
  admin: { id: string; name: string; email: string | null }
}

interface UserHistory {
  user: { id: string; name: string; email: string | null; lastLoginAt: string | null; createdAt: string; suspended: boolean }
  auditEntries: AuditLog[]
}

const ACTION_COLOURS: Record<string, string> = {
  USER_CREATED:      'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  USER_UPDATED:      'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  USER_DELETED:      'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  USER_SUSPENDED:    'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  PASSWORD_RESET:    'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  CLASSROOM_DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  CLASSROOM_ARCHIVED:'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  CONTENT_DELETED:   'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  GRADE_OVERRIDDEN:  'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  FORCE_LOGOUT:      'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  STUDENT_REMOVED:   'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(date).toLocaleString()
}

export default function Security() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [actionFilter, setActionFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [historyUserId, setHistoryUserId] = useState('')
  const [history, setHistory] = useState<UserHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [forceLoggingOut, setForceLoggingOut] = useState<string | null>(null)
  const [tab, setTab] = useState<'audit' | 'history'>('audit')

  useEffect(() => {
    Promise.all([
      api.get(`/admin/security/audit-log${actionFilter ? `?action=${actionFilter}` : ''}`),
      api.get('/admin/security/audit-actions'),
    ]).then(([l, a]) => {
      setLogs(l.data)
      setActions(a.data)
    }).finally(() => setLoading(false))
  }, [actionFilter])

  async function loadHistory() {
    if (!historyUserId.trim()) return
    setHistoryLoading(true)
    try {
      const { data } = await api.get(`/admin/security/users/${historyUserId}/history`)
      setHistory(data)
    } catch {
      setHistory(null)
    } finally { setHistoryLoading(false) }
  }

  async function handleForceLogout(userId: string) {
    setForceLoggingOut(userId)
    try {
      await api.post(`/admin/security/users/${userId}/force-logout`)
      if (history?.user.id === userId) setHistory(h => h ? { ...h, user: { ...h.user } } : null)
    } finally { setForceLoggingOut(null) }
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security & Audit</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Admin action log and user session management</p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6 w-fit">
          {(['audit', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {t === 'audit' ? 'Audit Log' : 'User History'}
            </button>
          ))}
        </div>

        {tab === 'audit' ? (
          <>
            <div className="mb-4">
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All actions</option>
                {actions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-16 text-sm text-gray-500 dark:text-gray-400">No admin actions recorded yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Action</th>
                      <th className="px-4 py-3 text-left">Target</th>
                      <th className="px-4 py-3 text-left">Admin</th>
                      <th className="px-4 py-3 text-left">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLOURS[log.action] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.target ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.admin.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Look up user history</h2>
              <div className="flex gap-2">
                <input value={historyUserId} onChange={e => setHistoryUserId(e.target.value)}
                  placeholder="Paste a user ID…"
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={loadHistory} disabled={historyLoading || !historyUserId.trim()}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {historyLoading ? 'Loading…' : 'Look up'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Find user IDs on the Users page</p>
            </div>

            {history && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{history.user.name}</h2>
                    <p className="text-xs text-gray-400">{history.user.email} · Joined {new Date(history.user.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">Last login: {history.user.lastLoginAt ? new Date(history.user.lastLoginAt).toLocaleString() : 'Never'}</p>
                  </div>
                  <button
                    onClick={() => handleForceLogout(history.user.id)}
                    disabled={forceLoggingOut === history.user.id}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {forceLoggingOut === history.user.id ? 'Logging out…' : 'Force Logout'}
                  </button>
                </div>
                {history.auditEntries.length === 0 ? (
                  <p className="text-sm text-gray-400">No audit entries for this user</p>
                ) : (
                  <div className="space-y-2">
                    {history.auditEntries.map(e => (
                      <div key={e.id} className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${ACTION_COLOURS[e.action] ?? 'bg-gray-100 text-gray-600'}`}>{e.action}</span>
                        <span className="text-gray-600 dark:text-gray-300">{e.target ?? '—'}</span>
                        <span className="text-xs text-gray-400 ml-auto">{timeAgo(e.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

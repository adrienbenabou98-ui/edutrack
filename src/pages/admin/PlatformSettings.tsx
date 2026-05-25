import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import api from '../../api/client'

interface Setting {
  id: string
  key: string
  value: string
  updatedAt: string
}

interface Announcement {
  id: string
  message: string
  active: boolean
  createdAt: string
  createdBy: { name: string }
}

const SETTING_LABELS: Record<string, { label: string; description: string }> = {
  aiEnabled:                  { label: 'AI Feedback',             description: 'Enable Claude AI feedback on submissions' },
  pdfExportEnabled:           { label: 'PDF Export',              description: 'Allow teachers to export grades as PDF' },
  studentRegistrationEnabled: { label: 'Student Registration',    description: 'Allow new students to self-register' },
  analyticsEnabled:           { label: 'Analytics',               description: 'Show analytics charts to teachers' },
}

export default function PlatformSettings() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'flags' | 'announcements'>('flags')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/admin/platform/settings'), api.get('/admin/platform/announcements')]).then(([s, a]) => {
      setSettings(s.data)
      setAnnouncements(a.data)
    }).finally(() => setLoading(false))
  }, [])

  async function handleToggle(key: string, current: string) {
    const next = current === 'true' ? 'false' : 'true'
    setSettings(s => s.map(st => st.key === key ? { ...st, value: next } : st))
    setSaving(true)
    try {
      await api.put('/admin/platform/settings', [{ key, value: next }])
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } finally { setSaving(false) }
  }

  async function handlePostAnnouncement() {
    if (!newMessage.trim()) return
    setPosting(true)
    try {
      const { data } = await api.post('/admin/platform/announcements', { message: newMessage })
      setAnnouncements(a => [data, ...a])
      setNewMessage('')
    } finally { setPosting(false) }
  }

  async function handleToggleAnnouncement(id: string) {
    const { data } = await api.post(`/admin/platform/announcements/${id}/toggle`)
    setAnnouncements(a => a.map(ann => ann.id === id ? { ...ann, active: data.active } : ann))
  }

  async function handleDeleteAnnouncement(id: string) {
    await api.delete(`/admin/platform/announcements/${id}`)
    setAnnouncements(a => a.filter(ann => ann.id !== id))
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Feature flags and announcements</p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6 w-fit">
          {(['flags', 'announcements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {t === 'flags' ? 'Feature Flags' : 'Announcements'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'flags' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {settings.map(s => {
              const meta = SETTING_LABELS[s.key]
              return (
                <div key={s.key} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{meta?.label ?? s.key}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{meta?.description ?? ''}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(s.key, s.value)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${s.value === 'true' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${s.value === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )
            })}
            {saved && <div className="px-6 py-3 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">Saved</div>}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Compose */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Post Announcement</h2>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Write a message to show to all logged-in users…"
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button onClick={handlePostAnnouncement} disabled={posting || !newMessage.trim()}
                  className="btn-3d-indigo disabled:opacity-50">
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {announcements.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">No announcements yet</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {announcements.map(ann => (
                    <div key={ann.id} className="flex items-start justify-between px-5 py-4">
                      <div className="flex-1 mr-4">
                        <p className="text-sm text-gray-900 dark:text-white">{ann.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{ann.createdBy.name} · {new Date(ann.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ann.active ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {ann.active ? 'Live' : 'Hidden'}
                        </span>
                        <button onClick={() => handleToggleAnnouncement(ann.id)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          {ann.active ? 'Hide' : 'Show'}
                        </button>
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

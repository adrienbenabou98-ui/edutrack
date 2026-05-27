import { useEffect, useState } from 'react'
import TeacherNav from '../../components/TeacherNav'
import api from '../../api/client'

interface Classroom { id: string; name: string }
interface Announcement { id: string; title: string; body: string; classroomId: string | null; createdAt: string }

const TEMPLATES = [
  {
    label: 'Assignment reminder',
    title: 'Upcoming assignment due',
    body: 'Hi class,\n\nThis is a reminder that your assignment is due on [DATE]. Please ensure you submit via EduTrack before the deadline.\n\nIf you have any questions, please reach out.\n\nBest regards,\n[TEACHER NAME]',
  },
  {
    label: 'Test notification',
    title: 'Upcoming test',
    body: 'Hi class,\n\nWe have a test on [DATE] covering [TOPICS]. Please review your notes and practice questions.\n\nGood luck!\n[TEACHER NAME]',
  },
  {
    label: 'General update',
    title: 'Class update',
    body: 'Hi class,\n\nI wanted to share a quick update about [TOPIC].\n\n[MESSAGE]\n\nLet me know if you have any questions.\n[TEACHER NAME]',
  },
  {
    label: 'Parent newsletter',
    title: 'Monthly classroom newsletter',
    body: 'Dear parents and guardians,\n\nHere is an update on what we have been learning this month:\n\n[TOPICS COVERED]\n\nUpcoming events:\n[EVENTS]\n\nThank you for your support.\n[TEACHER NAME]',
  },
]

export default function Announcements() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [saving, setSaving] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    api.get('/classrooms').then(r => setClassrooms(r.data))
    api.get('/announcements').then(r => setAnnouncements(r.data)).catch(() => {})
  }, [])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.post('/announcements', {
        title,
        body,
        classroomId: classroomId || undefined,
      })
      setAnnouncements(prev => [data, ...prev])
      setTitle('')
      setBody('')
      setClassroomId('')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    await api.delete(`/announcements/${id}`)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TeacherNav activePage="announcements" />


      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Announcement Designer</h1>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Announcement</h2>
            <button
              type="button"
              onClick={() => setShowTemplates(t => !t)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {showTemplates ? 'Hide templates' : 'Use a template'}
            </button>
          </div>

          {showTemplates && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => { setTitle(t.title); setBody(t.body); setShowTemplates(false) }}
                  className="text-left border border-gray-200 dark:border-gray-700 rounded-xl p-3 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{t.title}</p>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={send} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject / Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="e.g. Upcoming test reminder"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Send to</label>
              <select
                value={classroomId}
                onChange={e => setClassroomId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All my classes</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                required
                rows={8}
                placeholder="Write your announcement here…"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-400">This will be visible to students in the Messages section.</p>
              <button type="submit" disabled={saving} className="btn-3d-indigo disabled:opacity-50">
                {saving ? 'Sending…' : 'Send announcement'}
              </button>
            </div>
          </form>
        </div>

        {announcements.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Sent Announcements</h2>
            <div className="space-y-3">
              {announcements.map(a => {
                const room = classrooms.find(c => c.id === a.classroomId)
                return (
                  <div key={a.id} className="flex items-start gap-3 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {room ? room.name : 'All classes'} · {new Date(a.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(a.id)}
                      className="text-xs text-red-400 hover:text-red-600 shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

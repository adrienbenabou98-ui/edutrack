import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth.store'
import api from '../api/client'

interface Message {
  id: string; body: string; createdAt: string; readAt: string | null
  sender: { id: string; name: string; role: string }
  classroom: { name: string } | null
}

export default function Messages() {
  const user = useAuthStore(s => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; enrollments?: { student: { id: string; name: string } }[] }[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/messages').then(r => setMessages(r.data)),
      api.get('/classrooms').then(r => setClassrooms(r.data)),
    ]).then(() => setLoading(false))
    api.patch('/messages/mark-read')
  }, [])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    try {
      const payload: any = { body }
      if (user?.role === 'TEACHER' && selectedClassroom && !recipientId) payload.classroomId = selectedClassroom
      if (recipientId) payload.recipientId = recipientId
      const { data } = await api.post('/messages', payload)
      setMessages(m => [data, ...m])
      setBody('')
      setRecipientId('')
    } finally {
      setSending(false)
    }
  }

  const students = classrooms.flatMap(c => (c.enrollments ?? []).map(e => ({ ...e.student, classroomName: c.name })))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <span className={`text-lg font-semibold ${user?.role === 'TEACHER' ? 'text-indigo-700' : 'text-teal-700'}`}>EduTrack</span>
        <div className="flex items-center gap-4">
          <a href={user?.role === 'TEACHER' ? '/teacher' : '/student'} className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Messages</h1>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="font-medium text-gray-900 dark:text-white mb-4">
            {user?.role === 'TEACHER' ? 'Send message or announcement' : 'Reply to teacher'}
          </h2>
          <form onSubmit={send} className="space-y-3">
            {user?.role === 'TEACHER' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Classroom announcement</label>
                  <select value={selectedClassroom} onChange={e => { setSelectedClassroom(e.target.value); setRecipientId('') }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Select class —</option>
                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Or direct message to student</label>
                  <select value={recipientId} onChange={e => { setRecipientId(e.target.value); setSelectedClassroom('') }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Select student —</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            {user?.role === 'STUDENT' && students.length === 0 && (
              <p className="text-sm text-gray-400">You need to enroll in a class before messaging your teacher.</p>
            )}
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Write your message…" required />
            <div className="flex justify-end">
              <button type="submit" disabled={sending || !body.trim()}
                className={`disabled:opacity-50 ${user?.role === 'TEACHER' ? 'btn-3d-indigo' : 'btn-3d-teal'}`}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-400">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(m => (
              <div key={m.id} className={`bg-white dark:bg-gray-800 border rounded-xl px-5 py-4 ${!m.readAt && m.sender.id !== user?.id ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{m.sender.name}</span>
                  <div className="flex items-center gap-2">
                    {m.classroom && <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{m.classroom.name}</span>}
                    <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

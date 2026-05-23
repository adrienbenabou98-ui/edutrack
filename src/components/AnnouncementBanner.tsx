import { useEffect, useState } from 'react'
import api from '../api/client'

interface Announcement { id: string; message: string; createdAt: string }

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dismissed_announcements') ?? '[]')) } catch { return new Set() }
  })

  useEffect(() => {
    api.get('/admin/announcements/active').then(r => setAnnouncements(r.data)).catch(() => {})
  }, [])

  function dismiss(id: string) {
    const next = new Set(dismissed).add(id)
    setDismissed(next)
    localStorage.setItem('dismissed_announcements', JSON.stringify([...next]))
  }

  const visible = announcements.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-1">
      {visible.map(a => (
        <div key={a.id} className="flex items-center gap-3 bg-indigo-600 text-white px-4 py-2.5 text-sm">
          <span className="flex-1">{a.message}</span>
          <button onClick={() => dismiss(a.id)} className="text-indigo-200 hover:text-white text-lg leading-none">×</button>
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'

export default function GoogleCalendarConnect() {
  const [linked, setLinked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [flash, setFlash] = useState<'connected' | 'error' | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    api.get('/google/status')
      .then(r => setLinked(r.data.linked))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const status = searchParams.get('google')
    if (status === 'connected') {
      setLinked(true)
      setFlash('connected')
      setSearchParams(p => { p.delete('google'); return p })
      setTimeout(() => setFlash(null), 4000)
    } else if (status === 'error') {
      setFlash('error')
      setSearchParams(p => { p.delete('google'); return p })
      setTimeout(() => setFlash(null), 4000)
    }
  }, [])

  async function connect() {
    setConnecting(true)
    try {
      const { data } = await api.get('/google/connect')
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Could not start Google connection.')
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect() {
    await api.post('/google/disconnect')
    setLinked(false)
  }

  return (
    <div className="space-y-3">
      {flash === 'connected' && (
        <div className="px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
          Google Calendar connected successfully.
        </div>
      )}
      {flash === 'error' && (
        <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          Google connection failed. Please try again.
        </div>
      )}

      <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Google Calendar</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {loading
                ? 'Checking status…'
                : linked
                  ? 'Connected — due dates and reminders sync automatically'
                  : 'Connect to sync assignment due dates and reminders'}
            </p>
          </div>
        </div>
        {!loading && (
          linked ? (
            <button
              onClick={disconnect}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg shrink-0"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="btn-3d-indigo shrink-0 disabled:opacity-50"
            >
              {connecting ? 'Opening…' : 'Connect'}
            </button>
          )
        )}
      </div>
    </div>
  )
}

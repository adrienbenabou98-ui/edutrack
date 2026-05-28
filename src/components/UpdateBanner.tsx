import { useEffect, useState } from 'react'
import api from '../api/client'

// Polls the backend's public /version endpoint. When the deployed version
// changes (a new Railway deploy), active users see a non-intrusive prompt to
// refresh, so they pick up the latest build without closing the app.
//
// Privacy: this only GETs a build-version string. It sends no user data and the
// response contains no PII or secrets — safe for every signed-in or signed-out
// user.
const POLL_INTERVAL_MS = 3 * 60 * 1000 // every 3 minutes

export default function UpdateBanner() {
  const [knownVersion, setKnownVersion] = useState<string | null>(null)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkVersion() {
      try {
        const { data } = await api.get('/version')
        const v = data?.version
        if (!v || cancelled) return
        if (knownVersion === null) {
          setKnownVersion(v)
        } else if (v !== knownVersion) {
          setUpdateReady(true)
        }
      } catch {
        // Network hiccup / cold start — ignore and try again next interval.
      }
    }

    checkVersion()
    const id = setInterval(checkVersion, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [knownVersion])

  if (!updateReady) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
      <span>A new version of EduTrack is available.</span>
      <button
        onClick={() => window.location.reload()}
        className="bg-white text-gray-900 font-medium px-3 py-1 rounded-full hover:bg-gray-100"
      >
        Refresh
      </button>
    </div>
  )
}

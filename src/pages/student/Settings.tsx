import { useNavigate } from 'react-router-dom'
import GoogleCalendarConnect from '../../components/GoogleCalendarConnect'

export default function StudentSettings() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/student')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">← Dashboard</button>
        <span className="text-lg font-semibold text-teal-700 dark:text-teal-400">Settings</span>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Integrations</h2>
            <p className="text-sm text-gray-400 mt-1">Connect third-party services to enhance your experience.</p>
          </div>
          <GoogleCalendarConnect />
        </div>
      </main>
    </div>
  )
}

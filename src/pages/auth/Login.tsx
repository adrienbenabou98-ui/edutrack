import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

export default function Login() {
  const [mode, setMode] = useState<'email' | 'username'>('email')

  // Email mode fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Username mode fields (years 1-6)
  const [username, setUsername] = useState('')
  const [classPassword, setClassPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithUsername } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'email') {
        await login(email, password)
      } else {
        await loginWithUsername(username, '', classPassword)
      }
      const role = useAuthStore.getState().user?.role
      navigate(role === 'TEACHER' ? '/teacher' : '/student')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 w-full max-w-md p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to EduTrack</p>
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('email'); setError('') }}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'email' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Email login
          </button>
          <button
            type="button"
            onClick={() => { setMode('username'); setError('') }}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'username' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Years 1–6
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'email' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@school.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. alice.j"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class password</label>
                <input
                  type="password"
                  value={classPassword}
                  onChange={e => setClassPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ask your teacher"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {mode === 'email' && (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

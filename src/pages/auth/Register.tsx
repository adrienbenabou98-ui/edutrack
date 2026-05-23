import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'STUDENT' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAuthStore(s => s.register)
  const navigate = useNavigate()

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.email, form.password, form.name, form.role)
      navigate(form.role === 'TEACHER' ? '/teacher' : '/student')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Create an account</h1>
          <p className="text-gray-500 mt-1">Join EduTrack today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@school.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              {['TEACHER', 'STUDENT'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => update('role', r)}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.role === r
                      ? r === 'TEACHER'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-teal-600 border-teal-600 text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {r === 'TEACHER' ? 'Teacher' : 'Student'}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition-colors ${
              form.role === 'TEACHER' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

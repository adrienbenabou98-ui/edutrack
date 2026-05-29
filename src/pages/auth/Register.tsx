import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

const PW_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number or special character (!@#$…)', test: (p: string) => /[0-9!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(p) },
]

function CheckIcon({ ok, touched }: { ok: boolean; touched: boolean }) {
  if (!touched) return <span className="w-4 h-4 rounded-full border border-gray-300 inline-block flex-shrink-0" />
  if (ok) return (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
  return (
    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'STUDENT' })
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAuthStore(s => s.register)
  const navigate = useNavigate()

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const allRulesMet = PW_RULES.every(r => r.test(form.password))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordTouched(true)
    if (!allRulesMet) return
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create an account</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Join EduTrack today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@school.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => { update('password', e.target.value); setPasswordTouched(true) }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
            />
            <ul className="mt-2 space-y-1">
              {PW_RULES.map(rule => {
                const ok = rule.test(form.password)
                return (
                  <li key={rule.label} className="flex items-center gap-2">
                    <CheckIcon ok={ok} touched={passwordTouched} />
                    <span className={`text-xs transition-colors ${
                      !passwordTouched ? 'text-gray-400 dark:text-gray-500' : ok ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                      {rule.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">I am a…</label>
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
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
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
            className={`w-full disabled:opacity-50 ${
              form.role === 'TEACHER' ? 'btn-3d-indigo' : 'btn-3d-teal'
            }`}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

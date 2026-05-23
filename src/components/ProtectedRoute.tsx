import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

interface Props {
  children: React.ReactNode
  role?: 'TEACHER' | 'STUDENT' | 'ADMIN'
}

function homeFor(role: string) {
  if (role === 'TEACHER') return '/teacher'
  if (role === 'ADMIN') return '/admin'
  return '/student'
}

export default function ProtectedRoute({ children, role }: Props) {
  const user = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={homeFor(user.role)} replace />
  }

  return <>{children}</>
}

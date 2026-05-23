import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import TeacherDashboard from './pages/teacher/Dashboard'
import ClassroomDetail from './pages/teacher/ClassroomDetail'
import NewAssignment from './pages/teacher/NewAssignment'
import TeacherAnalytics from './pages/teacher/Analytics'
import GradeTracker from './pages/teacher/GradeTracker'
import StudentGradeDetail from './pages/teacher/StudentGradeDetail'
import TeacherSettings from './pages/teacher/Settings'
import TeacherStudents from './pages/teacher/Students'
import MessagesPage from './pages/Messages'
import AdminUsers from './pages/admin/Users'
import AdminClassrooms from './pages/admin/Classrooms'
import AdminContent from './pages/admin/Content'
import AdminAnalytics from './pages/admin/Analytics'
import AdminPlatformSettings from './pages/admin/PlatformSettings'
import AdminSecurity from './pages/admin/Security'
import AnnouncementBanner from './components/AnnouncementBanner'
import StudentDashboard from './pages/student/Dashboard'
import TakeAssignment from './pages/student/TakeAssignment'
import StudentProgress from './pages/student/Progress'

export default function App() {
  const loadUser = useAuthStore(s => s.loadUser)

  useEffect(() => { loadUser() }, [])

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AnnouncementBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/teacher" element={<ProtectedRoute role="TEACHER"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/classroom/:id" element={<ProtectedRoute role="TEACHER"><ClassroomDetail /></ProtectedRoute>} />
        <Route path="/teacher/classroom/:id/new-assignment" element={<ProtectedRoute role="TEACHER"><NewAssignment /></ProtectedRoute>} />
        <Route path="/teacher/classroom/:id/analytics" element={<ProtectedRoute role="TEACHER"><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/teacher/grades" element={<ProtectedRoute role="TEACHER"><GradeTracker /></ProtectedRoute>} />
        <Route path="/teacher/grades/:studentId" element={<ProtectedRoute role="TEACHER"><StudentGradeDetail /></ProtectedRoute>} />
        <Route path="/teacher/settings" element={<ProtectedRoute role="TEACHER"><TeacherSettings /></ProtectedRoute>} />
        <Route path="/teacher/students" element={<ProtectedRoute role="TEACHER"><TeacherStudents /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute role="ADMIN"><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/classrooms" element={<ProtectedRoute role="ADMIN"><AdminClassrooms /></ProtectedRoute>} />
        <Route path="/admin/content" element={<ProtectedRoute role="ADMIN"><AdminContent /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute role="ADMIN"><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute role="ADMIN"><AdminPlatformSettings /></ProtectedRoute>} />
        <Route path="/admin/security" element={<ProtectedRoute role="ADMIN"><AdminSecurity /></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute role="STUDENT"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/assignment/:id" element={<ProtectedRoute role="STUDENT"><TakeAssignment /></ProtectedRoute>} />
        <Route path="/student/progress" element={<ProtectedRoute role="STUDENT"><StudentProgressPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <TeacherAnalytics />
      </div>
    </div>
  )
}

function StudentProgressPage() {
  const logout = useAuthStore(s => s.logout)
  const user = useAuthStore(s => s.user)
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-semibold text-teal-700">EduTrack</span>
        <div className="flex items-center gap-4">
          <a href="/student" className="text-sm text-teal-600 hover:text-teal-700">Dashboard</a>
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Progress</h1>
        <StudentProgress />
      </main>
    </div>
  )
}

import { useEffect } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import Rubrics from './pages/teacher/Rubrics'
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
import StudentRankings from './pages/student/Rankings'
import StudentAssignments from './pages/student/Assignments'

export default function App() {
  const loadUser = useAuthStore(s => s.loadUser)

  useEffect(() => { loadUser() }, [])

  const Router = typeof window !== 'undefined' && (window as any).electron ? HashRouter : BrowserRouter

  return (
    <ErrorBoundary>
    <Router>
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
        <Route path="/teacher/rubrics" element={<ProtectedRoute role="TEACHER"><Rubrics /></ProtectedRoute>} />
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
        <Route path="/student/rankings" element={<ProtectedRoute role="STUDENT"><StudentRankings /></ProtectedRoute>} />
        <Route path="/student/assignments" element={<ProtectedRoute role="STUDENT"><StudentAssignments /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
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

const STUDENT_NAV_CLS = "flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"

function StudentProgressPage() {
  const logout = useAuthStore(s => s.logout)
  const user = useAuthStore(s => s.user)
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <a href="/student" className="text-lg font-semibold text-teal-700">EduTrack</a>
        <div className="flex items-center gap-4">
          <a href="/student/assignments" className={STUDENT_NAV_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
            Assignments
          </a>
          <a href="/student/rankings" className={STUDENT_NAV_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
            </svg>
            Rankings
          </a>
          <a href="/student/progress" className="flex items-center gap-1.5 text-sm font-medium text-teal-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            My Progress
          </a>
          <a href="/messages" className={STUDENT_NAV_CLS}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Messages
          </a>
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

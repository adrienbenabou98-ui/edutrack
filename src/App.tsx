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
import TeacherAllAssignments from './pages/teacher/AllAssignments'
import TeacherRankings from './pages/teacher/TeacherRankings'
import TeacherTemplates from './pages/teacher/Templates'
import TeacherLessonPlanner from './pages/teacher/LessonPlanner'
import TeacherInterventions from './pages/teacher/Interventions'
import TeacherAnnouncements from './pages/teacher/Announcements'
import MessagesPage from './pages/Messages'
import AdminUsers from './pages/admin/Users'
import AdminClassrooms from './pages/admin/Classrooms'
import AdminContent from './pages/admin/Content'
import AdminAnalytics from './pages/admin/Analytics'
import AdminPlatformSettings from './pages/admin/PlatformSettings'
import AdminSecurity from './pages/admin/Security'
import AnnouncementBanner from './components/AnnouncementBanner'
import ElectronTitleBar from './components/ElectronTitleBar'
import StudentDashboard from './pages/student/Dashboard'
import TakeAssignment from './pages/student/TakeAssignment'
import StudentProgress from './pages/student/Progress'
import StudentRankings from './pages/student/Rankings'
import StudentAssignments from './pages/student/Assignments'
import StudentSettings from './pages/student/Settings'
import TeacherCalendar from './pages/teacher/Calendar'
import StudentCalendar from './pages/student/Calendar'
import StudentNav from './components/StudentNav'

export default function App() {
  const loadUser = useAuthStore(s => s.loadUser)

  useEffect(() => { loadUser() }, [])

  const Router = typeof window !== 'undefined' && (window as any).electron ? HashRouter : BrowserRouter

  return (
    <ErrorBoundary>
    <Router>
      <div className="flex flex-col h-screen overflow-hidden">
      <ElectronTitleBar />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
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
        <Route path="/teacher/assignments" element={<ProtectedRoute role="TEACHER"><TeacherAllAssignments /></ProtectedRoute>} />
        <Route path="/teacher/rankings" element={<ProtectedRoute role="TEACHER"><TeacherRankings /></ProtectedRoute>} />
        <Route path="/teacher/templates" element={<ProtectedRoute role="TEACHER"><TeacherTemplates /></ProtectedRoute>} />
        <Route path="/teacher/planner" element={<ProtectedRoute role="TEACHER"><TeacherLessonPlanner /></ProtectedRoute>} />
        <Route path="/teacher/interventions" element={<ProtectedRoute role="TEACHER"><TeacherInterventions /></ProtectedRoute>} />
        <Route path="/teacher/announcements" element={<ProtectedRoute role="TEACHER"><TeacherAnnouncements /></ProtectedRoute>} />
        <Route path="/teacher/calendar" element={<ProtectedRoute role="TEACHER"><TeacherCalendar /></ProtectedRoute>} />
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
        <Route path="/student/settings" element={<ProtectedRoute role="STUDENT"><StudentSettings /></ProtectedRoute>} />
        <Route path="/student/calendar" element={<ProtectedRoute role="STUDENT"><StudentCalendar /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </div>
      </div>
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

function StudentProgressPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentNav activePage="progress" />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">My Progress</h1>
        <StudentProgress />
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import Layout from './components/Layout'
import MaintenanceModal from './components/MaintenanceModal'
import ErrorBoundary from './components/ErrorBoundary'
import { MAINTENANCE_EVENT } from './lib/api'
import { Toaster } from './lib/toast'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailPage from './pages/CourseDetailPage'
import LessonPage from './pages/LessonPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsersPage from './pages/AdminUsersPage'
import SystemSettingsPage from './pages/SystemSettingsPage'
import InstructorDashboard from './pages/InstructorDashboard'
import InstructorCourseForm from './pages/InstructorCourseForm'
import InstructorStudentsPage from './pages/InstructorStudentsPage'
import AdminReportsPage from './pages/AdminReportsPage'
import ProfilePage from './pages/ProfilePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" />
  return <>{children}</>
}

function InstructorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (user?.role !== 'INSTRUCTOR' && user?.role !== 'ADMIN') return <Navigate to="/dashboard" />
  return <>{children}</>
}

function App() {
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null)
  const { logout } = useAuthStore()

  useEffect(() => {
    const handleMaintenance = (event: CustomEvent<{ message: string }>) => {
      setMaintenanceMessage(event.detail.message)
    }

    window.addEventListener(MAINTENANCE_EVENT, handleMaintenance as EventListener)
    return () => {
      window.removeEventListener(MAINTENANCE_EVENT, handleMaintenance as EventListener)
    }
  }, [])

  const handleLogout = () => {
    // Auth store üzerinden çıkış, isAuthenticated=false olacak
    logout()
    setMaintenanceMessage(null)
    window.location.href = '/login'
  }

  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
          },
        }}
      />
      <BrowserRouter>
        {maintenanceMessage && (
          <MaintenanceModal message={maintenanceMessage} onLogout={handleLogout} />
        )}
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Private Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:courseId" element={<CourseDetailPage />} />
            <Route path="lessons/:lessonId" element={<LessonPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Layout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
          </Route>

          {/* Instructor Routes */}
          <Route
            path="/instructor"
            element={
              <InstructorRoute>
                <Layout />
              </InstructorRoute>
            }
          >
            <Route index element={<InstructorDashboard />} />
            <Route path="courses/new" element={<InstructorCourseForm />} />
            <Route path="courses/:courseId/edit" element={<InstructorCourseForm />} />
            <Route path="courses/:courseId/students" element={<InstructorStudentsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App

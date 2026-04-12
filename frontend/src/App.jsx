import React, { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api } from './api'
import { getToken, logout } from './auth'
import DashboardShell from './components/layout/DashboardShell.jsx'
import RequireRole from './components/RequireRole.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import EmployeeDashboard from './pages/EmployeeDashboard.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'
import HrDashboard from './pages/HrDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ExecutiveDashboard from './pages/ExecutiveDashboard.jsx'
import SessionBootGate from './components/SessionBootGate.jsx'

export default function App() {
  const [me, setMe] = useState(null)
  /** false until we know whether a token yields a user (avoids /manager → login flash on refresh). */
  const [sessionChecked, setSessionChecked] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const t = getToken()
    if (!t) {
      setMe(null)
      setSessionChecked(true)
      return
    }
    api
      .get('/api/auth/me')
      .then((res) => {
        setMe(res.data)
        setSessionChecked(true)
      })
      .catch(() => {
        logout()
        setMe(null)
        setSessionChecked(true)
        navigate('/login', { replace: true })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!me) return
    // Redirect to role dashboard on first load.
    if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/') {
      const role = me.role
      navigate(`/${role.toLowerCase()}`, { replace: true })
    }
  }, [me, location.pathname, navigate])

  const handleLogout = () => {
    logout()
    setMe(null)
    navigate('/login')
  }

  return (
    <div>
      <Routes>
        <Route path="/login" element={<Login onLogin={(user) => setMe(user)} />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/employee"
          element={
            <RequireRole me={me} requiredRole="EMPLOYEE" sessionChecked={sessionChecked}>
              <DashboardShell me={me} onLogout={handleLogout}>
                <EmployeeDashboard />
              </DashboardShell>
            </RequireRole>
          }
        />
        <Route
          path="/manager"
          element={
            <RequireRole me={me} requiredRole="MANAGER" sessionChecked={sessionChecked}>
              <DashboardShell me={me} onLogout={handleLogout}>
                <ManagerDashboard />
              </DashboardShell>
            </RequireRole>
          }
        />
        <Route
          path="/hr"
          element={
            <RequireRole me={me} requiredRole="HR" sessionChecked={sessionChecked}>
              <DashboardShell me={me} onLogout={handleLogout}>
                <HrDashboard />
              </DashboardShell>
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole me={me} requiredRole="ADMIN" sessionChecked={sessionChecked}>
              <DashboardShell me={me} onLogout={handleLogout}>
                <AdminDashboard />
              </DashboardShell>
            </RequireRole>
          }
        />
        <Route
          path="/executive"
          element={
            <RequireRole me={me} requiredRole="EXECUTIVE" sessionChecked={sessionChecked}>
              <DashboardShell me={me} onLogout={handleLogout}>
                <ExecutiveDashboard />
              </DashboardShell>
            </RequireRole>
          }
        />

        <Route
          path="*"
          element={
            !sessionChecked ? (
              <SessionBootGate message="Loading…" />
            ) : me ? (
              <Navigate to={`/${me.role.toLowerCase()}`} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </div>
  )
}


import React from 'react'
import { Navigate } from 'react-router-dom'
import SessionBootGate from './SessionBootGate.jsx'

/**
 * @param {boolean} sessionChecked - false until /api/auth/me has finished (or no token). Prevents
 *   treating "me not loaded yet" as logged out when refreshing /manager etc.
 */
export default function RequireRole({ me, requiredRole, sessionChecked, children }) {
  if (!sessionChecked) {
    return <SessionBootGate message="Checking your session…" />
  }
  if (!me) {
    return <Navigate to="/login" replace />
  }
  if (me.role !== requiredRole) {
    const home = `/${String(me.role).toLowerCase()}`
    return <Navigate to={home} replace />
  }
  return children
}

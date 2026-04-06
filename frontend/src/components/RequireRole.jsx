import React from 'react'
import { Navigate } from 'react-router-dom'

export default function RequireRole({ me, requiredRole, children }) {
  if (!me) return <Navigate to="/login" replace />
  if (me.role !== requiredRole) return <Navigate to="/login" replace />
  return children
}


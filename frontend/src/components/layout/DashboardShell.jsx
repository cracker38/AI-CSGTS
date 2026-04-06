import React, { Suspense, lazy } from 'react'

const DashboardLayout = lazy(() => import('./DashboardLayout.jsx'))

function LayoutFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#64748b'
      }}
    >
      Loading workspace…
    </div>
  )
}

export default function DashboardShell(props) {
  return (
    <Suspense fallback={<LayoutFallback />}>
      <DashboardLayout {...props} />
    </Suspense>
  )
}

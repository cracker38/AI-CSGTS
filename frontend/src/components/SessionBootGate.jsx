import React from 'react'

/** Visible before dashboard CSS (Bootstrap) loads — avoids blank screen on /manager refresh. */
export default function SessionBootGate({ message = 'Checking your session…' }) {
  return (
    <div className="app-session-gate">
      <div className="app-session-gate__spinner" role="status" aria-label="Loading" />
      {message}
    </div>
  )
}

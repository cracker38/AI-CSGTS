import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { formatInstant } from './adminHelpers.js'
import { RoleCard, RoleLoading, RoleTable } from '../dashboard/dashboardRoleUi.jsx'

export default function AdminLoginHistory() {
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data: body } = await api.get('/api/admin/login-events', { params: { page, size: 25 } })
      setData(body)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'LOAD_FAILED')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const rows = data?.content || []
  const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 0

  return (
    <div className="row g-3">
      <div className="col-12">
        <RoleCard title="Login & session attempts" iconClass="bi-door-open-fill">
          <p className="small text-body-secondary mb-3">
            Successful and failed sign-ins (user activity panel, spec module 1). IP reflects the app server view; use a reverse proxy
            header for real client IPs in production.
          </p>
          {error ? <div className="alert alert-danger py-2">{error}</div> : null}
          {loading ? (
            <RoleLoading>Loading login events…</RoleLoading>
          ) : (
            <>
              <RoleTable>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Success</th>
                    <th>Email</th>
                    <th>User</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="text-nowrap small">{formatInstant(r.createdAt)}</td>
                      <td>
                        {r.success ? (
                          <span className="badge text-bg-success">Yes</span>
                        ) : (
                          <span className="badge text-bg-danger">No</span>
                        )}
                      </td>
                      <td className="small">{r.emailAttempt || '—'}</td>
                      <td className="small">{r.user ? `${r.user.name} (${r.user.email})` : '—'}</td>
                      <td className="small text-break">{r.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </RoleTable>
              {rows.length === 0 && <p className="text-body-secondary small mb-0">No events recorded yet — sign in once to populate.</p>}
              <div className="d-flex align-items-center gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </button>
                <span className="small text-body-secondary">
                  Page {page + 1}
                  {totalPages > 0 ? ` / ${totalPages}` : ''}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={loading || (totalPages > 0 && page >= totalPages - 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
                <button type="button" className="btn btn-sm btn-outline-primary ms-auto" disabled={loading} onClick={() => load()}>
                  Refresh
                </button>
              </div>
            </>
          )}
        </RoleCard>
      </div>
    </div>
  )
}

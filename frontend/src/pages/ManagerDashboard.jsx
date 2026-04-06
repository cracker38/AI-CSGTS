import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { RoleAlerts, RoleCard, RoleLoading, RoleTable, SmallBoxKpi } from './dashboard/dashboardRoleUi.jsx'

const GAP_COL = { green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444' }

export default function ManagerDashboard() {
  const [data, setData] = useState(null)
  const [pending, setPending] = useState([])
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [allocProjectId, setAllocProjectId] = useState('')
  const [maxAssignees, setMaxAssignees] = useState(3)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      setError('')
      try {
        const [dash, pen, proj] = await Promise.all([
          api.get('/api/manager/dashboard'),
          api.get('/api/manager/training-assignments/pending'),
          api.get('/api/manager/projects')
        ])
        setData(dash.data)
        setPending(pen.data || [])
        const plist = proj.data || []
        setProjects(plist)
        if (plist.length) {
          setAllocProjectId((prev) => prev || String(plist[0].id))
        }
      } catch (e) {
        setError(e?.response?.data?.error || 'FAILED_TO_LOAD_DASHBOARD')
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!data) return
    if ((window.location.hash || '').replace(/^#/, '') !== 'approvals') return
    const t = window.setTimeout(() => {
      document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)
    return () => clearTimeout(t)
  }, [data])

  async function approveTraining(id) {
    setBusy(true)
    setError('')
    try {
      await api.post(`/api/manager/training-assignments/${id}/approve`, {})
      const pen = await api.get('/api/manager/training-assignments/pending')
      setPending(pen.data || [])
    } catch (e) {
      setError(e?.response?.data?.error || 'APPROVE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function runAllocate(e) {
    e.preventDefault()
    if (!allocProjectId) return
    setBusy(true)
    setError('')
    try {
      await api.post(`/api/manager/projects/${allocProjectId}/auto-allocate`, { maxAssignees: Number(maxAssignees) })
      const dash = await api.get('/api/manager/dashboard')
      setData(dash.data)
    } catch (e) {
      setError(e?.response?.data?.error || 'ALLOCATE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  const team = data?.team || []
  const perf = data?.teamPerformance || {}

  return (
    <>
      <RoleAlerts error={error} />

      {!data ? (
        <RoleLoading>Loading team intelligence…</RoleLoading>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12">
              <div className="card bg-gradient shadow-sm" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <div className="card-body text-white">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 bg-white bg-opacity-25 d-flex align-items-center justify-content-center fw-bold fs-4"
                      style={{ width: '3rem', height: '3rem' }}
                    >
                      M
                    </div>
                    <div>
                      <h2 className="h4 mb-1">Manager command center</h2>
                      <p className="mb-2 small opacity-90">
                        Team competency, skill gaps, training reviews, and smart project staffing.
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        <span className="badge bg-light text-primary">Team size: {perf.totalEmployees ?? team.length}</span>
                        <span className="badge bg-light text-primary">
                          Training completed (dept): {perf.trainingCompletedInDept ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <SmallBoxKpi value={team.length} label="Team members" variant="primary" iconClass="bi-people-fill" />
            </div>
            <div className="col-md-4">
              <SmallBoxKpi value={pending.length} label="Pending training reviews" variant="warning" iconClass="bi-hourglass-split" />
            </div>
            <div className="col-md-4">
              <SmallBoxKpi value={projects.length} label="Active projects" variant="info" iconClass="bi-kanban" />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-xl-7">
              <RoleCard title="Team overview & skill levels" iconClass="bi-table">
                <RoleTable>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Skills</th>
                      <th style={{ color: GAP_COL.green }}>G</th>
                      <th style={{ color: GAP_COL.yellow }}>Y</th>
                      <th style={{ color: GAP_COL.orange }}>O</th>
                      <th style={{ color: GAP_COL.red }}>R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((e) => (
                      <tr key={e.employeeId}>
                        <td>
                          <strong>{e.name}</strong>
                          <div className="small text-body-secondary">{e.email}</div>
                        </td>
                        <td>{e.jobRoleName || '—'}</td>
                        <td>
                          {(e.skills || []).slice(0, 6).map((s, i) => (
                            <span key={i} className="badge text-bg-light border text-dark me-1 mb-1">
                              {s.skillName}: {s.level}
                            </span>
                          ))}
                          {(e.skills || []).length === 0 && <span className="text-body-secondary">—</span>}
                        </td>
                        {['green', 'yellow', 'orange', 'red'].map((k) => (
                          <td key={k} className="text-center">
                            <strong style={{ color: GAP_COL[k] }}>{e.gapCounts?.[k] ?? 0}</strong>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </RoleTable>
                <p className="small text-body-secondary mt-2 mb-0">{perf.notes}</p>
              </RoleCard>
            </div>

            <div className="col-xl-5">
              <RoleCard id="approvals" title="Approve training requests" iconClass="bi-check2-circle">
                {pending.length === 0 ? (
                  <p className="text-body-secondary mb-0">No pending assessments — you’re all caught up.</p>
                ) : (
                  pending.map((p) => (
                    <div key={p.id} className="card bg-body-secondary mb-2">
                      <div className="card-body py-2 d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div>
                          <strong>{p.programTitle}</strong>
                          <div className="small text-body-secondary">
                            {p.employeeName} · requested {String(p.requestedAt).slice(0, 10)}
                          </div>
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => approveTraining(p.id)}>
                          Approve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </RoleCard>

              <RoleCard title="Project resource allocation" iconClass="bi-lightning-charge" className="mt-3">
                <form onSubmit={runAllocate} className="row g-2 align-items-end">
                  <div className="col-md-6">
                    <label className="form-label">Project</label>
                    <select
                      className="form-select"
                      value={allocProjectId}
                      onChange={(e) => setAllocProjectId(e.target.value)}
                    >
                      {projects.length === 0 ? (
                        <option value="">No projects in system</option>
                      ) : (
                        projects.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.name} {pr.requiredJobRoleName ? `(${pr.requiredJobRoleName})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Max assignees</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      max={50}
                      value={maxAssignees}
                      onChange={(e) => setMaxAssignees(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <button className="btn btn-primary w-100" type="submit" disabled={busy || !projects.length}>
                      {busy ? 'Allocating…' : 'Auto-allocate'}
                    </button>
                  </div>
                </form>
                <p className="small text-body-secondary mt-2 mb-0">
                  Assigns best-fit employees in your department to the project based on skill-gap scores.
                </p>
              </RoleCard>

              <RoleCard title="Team performance snapshot" iconClass="bi-graph-up" className="mt-3">
                <p className="small text-body-secondary mb-2">Coverage mix across the team (aggregate gap counts).</p>
                <div className="d-flex align-items-end gap-1" style={{ height: 64 }}>
                  {team.map((e) => {
                    const total =
                      (e.gapCounts?.green || 0) +
                        (e.gapCounts?.yellow || 0) +
                        (e.gapCounts?.orange || 0) +
                        (e.gapCounts?.red || 0) || 1
                    const h = Math.max(8, ((e.gapCounts?.green || 0) / total) * 100)
                    return (
                      <div
                        key={e.employeeId}
                        className="flex-fill rounded-top"
                        style={{
                          height: `${h}%`,
                          minHeight: 8,
                          background: `linear-gradient(180deg, ${GAP_COL.green}, ${GAP_COL.yellow})`,
                          opacity: 0.9
                        }}
                        title={e.name}
                      />
                    )
                  })}
                </div>
              </RoleCard>
            </div>
          </div>
        </>
      )}
    </>
  )
}

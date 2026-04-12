import React, { useEffect, useState } from 'react'
import { api } from '../api'
import CsgtsModuleMap from './dashboard/CsgtsModuleMap.jsx'
import { RoleAlerts, RoleCard, RoleLoading } from './dashboard/dashboardRoleUi.jsx'

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState(null)
  const [succession, setSuccession] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setError('')
    setLoading(true)
    Promise.all([api.get('/api/executive/summary'), api.get('/api/executive/succession')])
      .then(([sumRes, succRes]) => {
        if (alive) {
          setSummary(sumRes.data)
          setSuccession(succRes.data || [])
        }
      })
      .catch((e) => {
        if (alive) setError(e?.response?.data?.error || e?.message || 'LOAD_FAILED')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <div className="card bg-primary bg-gradient text-white mb-3 shadow-sm">
        <div className="card-body py-3">
          <div className="d-flex align-items-center gap-3">
            <span className="rounded-2 bg-white bg-opacity-25 px-3 py-2 fw-bold">Exec</span>
            <div>
              <h2 className="h5 mb-0">Executive overview</h2>
              <p className="mb-0 small opacity-75">
                Read-only workforce readiness, training pipeline, and project footprint — aligned with reporting module 7.
              </p>
            </div>
          </div>
        </div>
      </div>

      <RoleAlerts error={error} />

      {loading ? (
        <RoleLoading>Loading executive metrics…</RoleLoading>
      ) : summary ? (
        <div className="row g-3 mb-2">
          <div className="col-md-4">
            <RoleCard title="Org readiness" iconClass="bi-activity">
              <p className="display-6 fw-semibold mb-0">{summary.orgReadinessPct ?? 0}%</p>
              <p className="small text-body-secondary mb-0">Average share of green required skills across active employees with a job role.</p>
            </RoleCard>
          </div>
          <div className="col-md-4">
            <RoleCard title="Employees" iconClass="bi-people">
              <p className="h4 mb-1">
                {summary.activeEmployees ?? 0} <span className="text-body-secondary fs-6">active</span>
              </p>
              <p className="small text-body-secondary mb-0">Total roster: {summary.totalEmployees ?? 0}</p>
              <p className="small text-body-secondary mb-0">With critical gaps: {summary.employeesWithCriticalGaps ?? 0}</p>
            </RoleCard>
          </div>
          <div className="col-md-4">
            <RoleCard title="Training & projects" iconClass="bi-graph-up-arrow">
              <p className="small mb-1">
                Pending requests: <strong>{summary.pendingTrainingRequests ?? 0}</strong>
              </p>
              <p className="small mb-1">
                Completed assignments: <strong>{summary.completedTrainingAssignments ?? 0}</strong>
              </p>
              <p className="small text-body-secondary mb-0">Active projects: {summary.activeProjects ?? 0}</p>
            </RoleCard>
          </div>
        </div>
      ) : null}

      {succession && succession.length > 0 ? (
        <div className="card border shadow-sm mb-3">
          <div className="card-header py-2">
            <h3 className="h6 mb-0">
              <i className="bi bi-diagram-2 me-2 text-primary" aria-hidden />
              Succession snapshot (MVP)
            </h3>
            <p className="small text-body-secondary mb-0 mt-1">
              Top readiness candidates per job role — heuristic from green skill coverage vs. requirements.
            </p>
          </div>
          <div className="card-body py-2">
            <div className="accordion accordion-flush" id="exec-succession-acc">
              {succession.map((block, idx) => (
                <div key={block.jobRoleId} className="accordion-item">
                  <h4 className="accordion-header">
                    <button
                      className={`accordion-button${idx > 0 ? ' collapsed' : ''}`}
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#succ-${block.jobRoleId}`}
                      aria-expanded={idx === 0}
                    >
                      {block.jobRoleName}
                      <span className="badge text-bg-secondary ms-2">
                        {(block.candidates || []).length} candidate{(block.candidates || []).length === 1 ? '' : 's'}
                      </span>
                    </button>
                  </h4>
                  <div
                    id={`succ-${block.jobRoleId}`}
                    className={`accordion-collapse collapse${idx === 0 ? ' show' : ''}`}
                    data-bs-parent="#exec-succession-acc"
                  >
                    <div className="accordion-body pt-0">
                      {(block.candidates || []).length === 0 ? (
                        <p className="small text-body-secondary mb-0">No active employees mapped to this role.</p>
                      ) : (
                        <ul className="list-group list-group-flush">
                          {(block.candidates || []).map((c) => (
                            <li
                              key={c.employeeId}
                              className="list-group-item d-flex justify-content-between align-items-center px-0"
                            >
                              <span>{c.name}</span>
                              <span className="small text-body-secondary text-end">
                                Readiness {c.readinessPct}%
                                {c.criticalGaps > 0 ? (
                                  <span className="text-danger ms-2">· {c.criticalGaps} critical gap(s)</span>
                                ) : null}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <CsgtsModuleMap role="EXECUTIVE" />
    </>
  )
}

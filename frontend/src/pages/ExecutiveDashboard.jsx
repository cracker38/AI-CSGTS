import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { RoleAlerts, RoleCard, RoleLoading } from './dashboard/dashboardRoleUi.jsx'
import { downloadBlob } from './admin/adminHelpers.js'

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState(null)
  const [strategy, setStrategy] = useState(null)
  const [succession, setSuccession] = useState(null)
  const [simulation, setSimulation] = useState(null)
  const [simForm, setSimForm] = useState({
    hiresPlanned: 2,
    trainingsPlanned: 20,
    skillGapSeverity: 120,
    trainingCost: 40000,
    projectUrgency: 30,
    weight1: 0.5,
    weight2: 0.2,
    weight3: 0.3
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    setError('')
    setLoading(true)
    Promise.all([api.get('/api/executive/summary'), api.get('/api/executive/succession'), api.get('/api/executive/strategy')])
      .then(([sumRes, succRes, stratRes]) => {
        if (alive) {
          setSummary(sumRes.data)
          setSuccession(succRes.data || [])
          setStrategy(stratRes.data || null)
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

  async function runSimulation(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = {
        ...simForm,
        hiresPlanned: Number(simForm.hiresPlanned),
        trainingsPlanned: Number(simForm.trainingsPlanned),
        skillGapSeverity: Number(simForm.skillGapSeverity),
        trainingCost: Number(simForm.trainingCost),
        projectUrgency: Number(simForm.projectUrgency),
        weight1: Number(simForm.weight1),
        weight2: Number(simForm.weight2),
        weight3: Number(simForm.weight3)
      }
      const res = await api.post('/api/executive/simulate', payload)
      setSimulation(res.data)
    } catch (e2) {
      setError(e2?.response?.data?.error || e2?.message || 'SIMULATION_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function downloadBriefingCsv() {
    try {
      const res = await api.get('/api/executive/briefing.csv', { responseType: 'blob' })
      downloadBlob('executive-briefing.csv', res.data)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'CSV_DOWNLOAD_FAILED')
    }
  }

  async function downloadBriefingPptx() {
    try {
      const res = await api.get('/api/executive/briefing.pptx', { responseType: 'blob' })
      downloadBlob('executive-briefing.pptx', res.data)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'PPTX_DOWNLOAD_FAILED')
    }
  }

  return (
    <>
      <div className="card bg-primary bg-gradient text-white mb-3 shadow-sm">
        <div className="card-body py-3">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-3">
            <span className="rounded-2 bg-white bg-opacity-25 px-3 py-2 fw-bold">Exec</span>
            <div>
              <h2 className="h5 mb-0">Executive overview</h2>
              <p className="mb-0 small opacity-75">
                Read-only workforce readiness, training pipeline, and project footprint — aligned with reporting module 7.
              </p>
            </div>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-light btn-sm" onClick={downloadBriefingCsv}>
                <i className="bi bi-filetype-csv me-1" />
                Export CSV
              </button>
              <button type="button" className="btn btn-light btn-sm" onClick={downloadBriefingPptx}>
                <i className="bi bi-file-earmark-slides me-1" />
                Export PPTX
              </button>
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
          <div className="col-md-4">
            <RoleCard title="Training effectiveness" iconClass="bi-check2-circle">
              <p className="display-6 fw-semibold mb-0">{summary.trainingEffectivenessPct ?? 0}%</p>
              <p className="small text-body-secondary mb-0">Completed assignments share in pipeline outcomes.</p>
            </RoleCard>
          </div>
          <div className="col-md-4">
            <RoleCard title="Talent risk index" iconClass="bi-exclamation-triangle">
              <p className="display-6 fw-semibold mb-0">{summary.talentRiskIndex ?? 0}</p>
              <p className="small text-body-secondary mb-0">Critical-gap exposure across active workforce.</p>
            </RoleCard>
          </div>
          <div className="col-md-4">
            <RoleCard title="Decision score" iconClass="bi-calculator">
              <p className="display-6 fw-semibold mb-0">{strategy?.decisionSupportModel?.decisionScore ?? 0}</p>
              <p className="small text-body-secondary mb-0">{strategy?.decisionFormula}</p>
            </RoleCard>
          </div>
        </div>
      ) : null}

      {strategy ? (
        <div className="row g-3 mb-3">
          <div className="col-lg-7">
            <RoleCard title="Forecasts & trends" iconClass="bi-graph-up">
              <p className="small mb-1">Future skill demand index: <strong>{strategy?.forecasts?.futureSkillDemandIndex ?? 0}</strong></p>
              <p className="small mb-2">Workforce gap forecast index: <strong>{strategy?.forecasts?.workforceGapForecastIndex ?? 0}</strong></p>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Demand count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(strategy?.forecasts?.skillDemandTrends || []).slice(0, 8).map((r) => (
                      <tr key={`${r.skillId}-${r.skillName}`}>
                        <td>{r.skillName}</td>
                        <td>{r.demandCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="small text-body-secondary mt-2 mb-0">Workflow: {(strategy.workflow || []).join(' → ')}</p>
            </RoleCard>
          </div>
          <div className="col-lg-5">
            <RoleCard title="What-if scenario simulator" iconClass="bi-bezier2">
              <form onSubmit={runSimulation} className="row g-2">
                {[
                  ['hiresPlanned', 'Hires planned'],
                  ['trainingsPlanned', 'Trainings planned'],
                  ['skillGapSeverity', 'Skill gap severity'],
                  ['trainingCost', 'Training cost'],
                  ['projectUrgency', 'Project urgency'],
                  ['weight1', 'Weight 1'],
                  ['weight2', 'Weight 2'],
                  ['weight3', 'Weight 3']
                ].map(([key, label]) => (
                  <div className="col-6" key={key}>
                    <label className="form-label small">{label}</label>
                    <input
                      className="form-control form-control-sm"
                      type="number"
                      step={key.startsWith('weight') ? '0.1' : '1'}
                      value={simForm[key]}
                      onChange={(e) => setSimForm((s) => ({ ...s, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="col-12">
                  <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                    {busy ? 'Simulating…' : 'Run simulation'}
                  </button>
                </div>
              </form>
              {simulation?.result ? (
                <div className="small mt-3">
                  <p className="mb-1">Projected gap severity: <strong>{simulation.result.projectedSkillGapSeverity}</strong></p>
                  <p className="mb-1">Projected total cost: <strong>{simulation.result.projectedTotalCost}</strong></p>
                  <p className="mb-1">Decision score: <strong>{simulation.result.decisionScore}</strong></p>
                  <p className="text-body-secondary mb-0">{simulation.result.recommendation}</p>
                </div>
              ) : null}
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
    </>
  )
}

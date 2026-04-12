import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { RoleAlerts, RoleCard, RoleLoading, RoleTable, SmallBoxKpi } from './dashboard/dashboardRoleUi.jsx'
import CsgtsModuleMap from './dashboard/CsgtsModuleMap.jsx'

const GAP_COL = { green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444' }
const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']

function healthTier(gapCounts) {
  const g = gapCounts || {}
  if ((g.red || 0) > 0) return { label: 'Critical', variant: 'danger', icon: 'bi-exclamation-octagon-fill' }
  if ((g.orange || 0) > 0) return { label: 'Elevated', variant: 'warning', icon: 'bi-exclamation-triangle-fill' }
  if ((g.yellow || 0) > 0) return { label: 'Watch', variant: 'info', icon: 'bi-eye-fill' }
  return { label: 'Strong', variant: 'success', icon: 'bi-shield-check' }
}

function GapDistributionBar({ aggregate }) {
  const a = aggregate || {}
  const g = a.green || 0
  const y = a.yellow || 0
  const o = a.orange || 0
  const r = a.red || 0
  const total = g + y + o + r
  if (total === 0) {
    return <p className="text-body-secondary small mb-0">No role-mapped skills yet — add job roles and required skills to unlock gap analytics.</p>
  }
  const pct = (n) => `${(100 * n) / total}%`
  return (
    <div className="mgr-gap-stack rounded-3 overflow-hidden d-flex" style={{ height: 14 }} title={`G ${g} · Y ${y} · O ${o} · R ${r}`}>
      {g > 0 && <div style={{ width: pct(g), background: GAP_COL.green }} />}
      {y > 0 && <div style={{ width: pct(y), background: GAP_COL.yellow }} />}
      {o > 0 && <div style={{ width: pct(o), background: GAP_COL.orange }} />}
      {r > 0 && <div style={{ width: pct(r), background: GAP_COL.red }} />}
    </div>
  )
}

function ReadinessRing({ score }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  const hue = s >= 75 ? 152 : s >= 50 ? 45 : s >= 30 ? 28 : 0
  return (
    <div
      className="mgr-readiness-ring"
      style={{
        background: `conic-gradient(hsl(${hue}, 75%, 48%) ${s * 3.6}deg, var(--bs-secondary-bg) 0)`
      }}
      title={`Readiness ${s}%`}
    >
      <div className="mgr-readiness-ring__inner">
        <span className="fw-bold fs-4">{s}</span>
        <span className="small text-body-secondary">/ 100</span>
      </div>
    </div>
  )
}

function SortTh({ label, active, dir, onClick }) {
  return (
    <th role="button" className="user-select-none" onClick={onClick} title="Sort">
      {label}
      {active ? <i className={`bi bi-caret-${dir === 'asc' ? 'up' : 'down'}-fill ms-1`} /> : null}
    </th>
  )
}

export default function ManagerDashboard() {
  const { hash } = useLocation()
  const [data, setData] = useState(null)
  const [pending, setPending] = useState([])
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [allocProjectId, setAllocProjectId] = useState('')
  const [maxAssignees, setMaxAssignees] = useState(3)
  const [busy, setBusy] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')
  const [sort, setSort] = useState({ key: 'severityScore', dir: 'desc' })
  const [expandedId, setExpandedId] = useState(null)
  const [staffProjectId, setStaffProjectId] = useState('')
  const [staffRows, setStaffRows] = useState([])
  const [dragStaffIdx, setDragStaffIdx] = useState(null)
  const [mgrAssess, setMgrAssess] = useState({ skillId: '', level: 'INTERMEDIATE', note: '' })
  const staffRowsRef = useRef([])

  const load = useCallback(async () => {
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
        setStaffProjectId((prev) => prev || String(plist[0].id))
      }
    } catch (e) {
      setData(null)
      setError(e?.response?.data?.error || 'FAILED_TO_LOAD_DASHBOARD')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!staffProjectId) return
    let alive = true
    api
      .get(`/api/manager/projects/${staffProjectId}/dept-staffing`)
      .then((res) => {
        if (alive) setStaffRows(res.data || [])
      })
      .catch(() => {
        if (alive) setStaffRows([])
      })
    return () => {
      alive = false
    }
  }, [staffProjectId])

  useEffect(() => {
    staffRowsRef.current = staffRows
  }, [staffRows])

  useEffect(() => {
    if (!data) return
    const id = (hash || '').replace(/^#/, '')
    if (!id) return
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)
    return () => clearTimeout(t)
  }, [data, hash])

  async function approveTraining(id) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/api/manager/training-assignments/${id}/approve`, {})
      const [pen, dash] = await Promise.all([
        api.get('/api/manager/training-assignments/pending'),
        api.get('/api/manager/dashboard')
      ])
      setPending(pen.data || [])
      setData(dash.data)
      setSuccess('Training request approved — HR can finalize enrollment.')
    } catch (e) {
      setError(e?.response?.data?.error || 'APPROVE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function persistStaffOrder(nextRows) {
    if (!staffProjectId) return
    setBusy(true)
    setError('')
    try {
      await api.put(`/api/manager/projects/${staffProjectId}/dept-staffing-order`, {
        employeeIds: nextRows.map((r) => r.employeeId)
      })
      await load()
    } catch (err) {
      setError(err?.response?.data?.error || 'STAFF_ORDER_FAILED')
    } finally {
      setBusy(false)
    }
  }

  function onStaffDragStart(idx) {
    setDragStaffIdx(idx)
  }

  function onStaffDragOver(ev, idx) {
    ev.preventDefault()
    if (dragStaffIdx === null || dragStaffIdx === idx) return
    const next = [...staffRows]
    const [row] = next.splice(dragStaffIdx, 1)
    next.splice(idx, 0, row)
    setStaffRows(next)
    setDragStaffIdx(idx)
  }

  function onStaffDragEnd() {
    setDragStaffIdx(null)
    const rows = staffRowsRef.current
    if (rows.length) persistStaffOrder(rows)
  }

  async function submitManagerAssessment(employeeId) {
    if (!mgrAssess.skillId) {
      setError('Pick a skill for the assessment.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.post('/api/manager/skill-assessments', {
        employeeId,
        skillId: Number(mgrAssess.skillId),
        assessedLevel: mgrAssess.level,
        note: mgrAssess.note || null
      })
      setSuccess('Manager assessment recorded.')
      setMgrAssess({ skillId: '', level: 'INTERMEDIATE', note: '' })
      await load()
    } catch (err) {
      setError(err?.response?.data?.error || 'ASSESSMENT_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function runAllocate(e) {
    e.preventDefault()
    if (!allocProjectId) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.post(`/api/manager/projects/${allocProjectId}/auto-allocate`, {
        maxAssignees: Number(maxAssignees)
      })
      const dash = await api.get('/api/manager/dashboard')
      setData(dash.data)
      if (allocProjectId) {
        try {
          const st = await api.get(`/api/manager/projects/${allocProjectId}/dept-staffing`)
          setStaffRows(st.data || [])
        } catch {
          /* ignore */
        }
      }
      const n = res.data?.assignees ?? 0
      setSuccess(
        res.data?.status === 'ALLOCATED'
          ? `Allocated ${n} team member${n === 1 ? '' : 's'} to the project.`
          : res.data?.status === 'MISSING_REQUIRED_JOB_ROLE'
            ? 'Project has no required job role — HR must set it before auto-allocation.'
            : res.data?.status === 'NO_DEPARTMENT'
              ? 'Your account has no department.'
              : 'Allocation finished.'
      )
    } catch (err) {
      setError(err?.response?.data?.error || 'ALLOCATE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  const team = data?.team || []
  const perf = data?.teamPerformance || {}
  const dept = data?.department
  const aggregate = data?.aggregateGaps || {}
  const pipeline = data?.trainingPipeline || {}
  const projectCoverage = data?.projectCoverage || []

  const sortedTeam = useMemo(() => {
    let rows = [...team]
    const q = teamSearch.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (e) =>
          (e.name || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.jobRoleName || '').toLowerCase().includes(q)
      )
    }
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      if (key === 'name') return mul * String(a.name || '').localeCompare(String(b.name || ''))
      if (key === 'jobRoleName') return mul * String(a.jobRoleName || '').localeCompare(String(b.jobRoleName || ''))
      if (key === 'severityScore') return mul * ((a.severityScore || 0) - (b.severityScore || 0))
      if (key === 'red') return mul * ((a.gapCounts?.red || 0) - (b.gapCounts?.red || 0))
      if (key === 'green') return mul * ((a.gapCounts?.green || 0) - (b.gapCounts?.green || 0))
      return 0
    })
    return rows
  }, [team, teamSearch, sort])

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'jobRoleName' ? 'asc' : 'desc' }
    )
  }

  const readiness = perf.readinessScore ?? 0
  const atRisk = perf.atRiskCount ?? team.filter((e) => (e.gapCounts?.red || 0) > 0).length

  return (
    <div className="manager-dash">
      <RoleAlerts error={error} success={success} />

      {!data ? (
        <RoleLoading>Syncing department intelligence…</RoleLoading>
      ) : (
        <>
          <div className="row g-3 mb-3" id="overview">
            <div className="col-12">
              <div className="card mgr-hero shadow-sm border-0 overflow-hidden">
                <div className="card-body p-4 text-white position-relative">
                  <div className="row align-items-center g-4">
                    <div className="col-lg-8">
                      <div className="d-flex align-items-start gap-3">
                        <div className="mgr-hero-avatar">M</div>
                        <div>
                          <p className="text-white-50 small text-uppercase letter-spacing mb-1">Manager workspace</p>
                          <h2 className="h3 mb-2 fw-bold">Command center</h2>
                          <p className="mb-3 opacity-90 small lh-lg">
                            Live readiness, competency risk, training workflow, and project staffing for{' '}
                            <strong>{dept?.name || 'your department'}</strong>. Use the roster to coach individuals; use staffing
                            when projects need the best-fit people from your team.
                          </p>
                          <div className="d-flex flex-wrap gap-2">
                            <span className="badge rounded-pill bg-white bg-opacity-25">
                              Direct reports: {perf.directReportsCount ?? perf.totalEmployees ?? team.length}
                            </span>
                            <span className="badge rounded-pill bg-white bg-opacity-25">Training done: {perf.trainingCompletedInDept ?? 0}</span>
                            <span className="badge rounded-pill bg-white bg-opacity-25">Pending reviews: {pending.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-4 text-lg-end">
                      <div className="d-inline-flex align-items-center gap-3 mgr-hero-readiness">
                        <ReadinessRing score={readiness} />
                        <div className="text-start">
                          <div className="fw-semibold">Dept readiness</div>
                          <div className="small opacity-90">Average green share across required skills</div>
                          <div className="small mt-1">
                            <span className="text-warning">{atRisk}</span> with critical gaps
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-6 col-xl">
              <SmallBoxKpi value={team.length} label="Direct reports (employees)" variant="primary" iconClass="bi-people-fill" />
            </div>
            <div className="col-6 col-xl">
              <SmallBoxKpi value={`${readiness}%`} label="Readiness index" variant="success" iconClass="bi-speedometer2" />
            </div>
            <div className="col-6 col-xl">
              <SmallBoxKpi value={atRisk} label="At-risk (critical gaps)" variant="danger" iconClass="bi-heart-pulse-fill" />
            </div>
            <div className="col-6 col-xl">
              <SmallBoxKpi value={pending.length} label="Training queue" variant="warning" iconClass="bi-hourglass-split" />
            </div>
            <div className="col-6 col-xl">
              <SmallBoxKpi value={projects.length} label="Projects" variant="info" iconClass="bi-kanban-fill" />
            </div>
          </div>

          <div className="row g-3 mb-3" id="insights">
            <div className="col-lg-6">
              <RoleCard title="Competency mix (department)" iconClass="bi-pie-chart-fill">
                <p className="small text-body-secondary">Aggregate gap counts across everyone in {dept?.name || 'the department'}.</p>
                <GapDistributionBar aggregate={aggregate} />
                <div className="d-flex flex-wrap gap-3 mt-3 small">
                  {[
                    ['green', 'On target'],
                    ['yellow', 'Minor gap'],
                    ['orange', 'Meaningful gap'],
                    ['red', 'Critical gap']
                  ].map(([k, lab]) => (
                    <span key={k} className="d-flex align-items-center gap-1">
                      <span className="rounded-circle" style={{ width: 8, height: 8, background: GAP_COL[k] }} />
                      {lab}: <strong>{aggregate[k] ?? 0}</strong>
                    </span>
                  ))}
                </div>
              </RoleCard>
            </div>
            <div className="col-lg-6">
              <RoleCard title="Training pipeline" iconClass="bi-funnel-fill">
                <p className="small text-body-secondary">Assignments tied to your department (all statuses).</p>
                <div className="row g-2">
                  {['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'].map((st) => {
                    const n = pipeline[st] ?? 0
                    const label =
                      st === 'REQUESTED' ? 'Awaiting manager' : st === 'APPROVED' ? 'Approved (HR next)' : st === 'REJECTED' ? 'Rejected' : 'Completed'
                    return (
                      <div className="col-6" key={st}>
                        <div className="border rounded-3 p-3 h-100 bg-body-secondary bg-opacity-25">
                          <div className="text-body-secondary small">{label}</div>
                          <div className="fs-4 fw-bold">{n}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </RoleCard>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12">
              <RoleCard id="team" title="Team roster & risk" iconClass="bi-table" headerRight={<span className="badge text-bg-secondary">{sortedTeam.length} shown</span>}>
                <div className="row g-2 mb-3">
                  <div className="col-md-6 col-lg-4">
                    <input
                      type="search"
                      className="form-control form-control-sm"
                      placeholder="Search name, email, or role…"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      aria-label="Filter team"
                    />
                  </div>
                  <div className="col-md-6 col-lg-8 text-md-end">
                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => load()}>
                      <i className="bi bi-arrow-clockwise me-1" />
                      Refresh data
                    </button>
                  </div>
                </div>
                <RoleTable>
                  <thead>
                    <tr>
                      <SortTh label="Team member" active={sort.key === 'name'} dir={sort.dir} onClick={() => toggleSort('name')} />
                      <SortTh label="Job role" active={sort.key === 'jobRoleName'} dir={sort.dir} onClick={() => toggleSort('jobRoleName')} />
                      <th>Health</th>
                      <SortTh label="Severity" active={sort.key === 'severityScore'} dir={sort.dir} onClick={() => toggleSort('severityScore')} />
                      <th>Skill mix</th>
                      <SortTh label="G" active={sort.key === 'green'} dir={sort.dir} onClick={() => toggleSort('green')} />
                      <th style={{ color: GAP_COL.yellow }}>Y</th>
                      <th style={{ color: GAP_COL.orange }}>O</th>
                      <SortTh label="R" active={sort.key === 'red'} dir={sort.dir} onClick={() => toggleSort('red')} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeam.map((e) => {
                      const tier = healthTier(e.gapCounts)
                      const open = expandedId === e.employeeId
                      return (
                        <React.Fragment key={e.employeeId}>
                          <tr
                            className={open ? 'table-active' : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setExpandedId(open ? null : e.employeeId)}
                          >
                            <td>
                              <strong>{e.name}</strong>
                              <div className="small text-body-secondary">{e.email}</div>
                            </td>
                            <td>{e.jobRoleName || '—'}</td>
                            <td>
                              <span className={`badge text-bg-${tier.variant}`}>
                                <i className={`bi ${tier.icon} me-1`} />
                                {tier.label}
                              </span>
                            </td>
                            <td>
                              <span className="font-monospace">{e.severityScore ?? 0}</span>
                              <span className="small text-body-secondary"> pts</span>
                            </td>
                            <td onClick={(ev) => ev.stopPropagation()}>
                              <div className="d-flex flex-wrap gap-1" style={{ maxWidth: 220 }}>
                                {(e.skills || []).slice(0, 5).map((s, i) => (
                                  <span key={i} className="badge rounded-pill text-bg-light border text-dark">
                                    {s.skillName}: {s.level}
                                  </span>
                                ))}
                                {(e.skills || []).length === 0 && <span className="text-body-secondary small">No skills logged</span>}
                                {(e.skills || []).length > 5 && <span className="small text-body-secondary">+{e.skills.length - 5}</span>}
                              </div>
                            </td>
                            {['green', 'yellow', 'orange', 'red'].map((k) => (
                              <td key={k} className="text-center">
                                <strong style={{ color: GAP_COL[k] }}>{e.gapCounts?.[k] ?? 0}</strong>
                              </td>
                            ))}
                          </tr>
                          {open && (
                            <tr className="table-light">
                              <td colSpan={9} className="border-top-0 pt-0">
                                <div className="p-3 rounded-3 border bg-body-secondary bg-opacity-25">
                                  <div className="fw-semibold mb-2">
                                    <i className="bi bi-lightning-charge-fill me-1 text-primary" />
                                    Priority gaps to coach
                                  </div>
                                  {(e.topGaps || []).length === 0 ? (
                                    <p className="small text-body-secondary mb-0">No outstanding gaps vs job role — great coverage.</p>
                                  ) : (
                                    <ul className="list-unstyled mb-0 small">
                                      {(e.topGaps || []).map((g, idx) => (
                                        <li key={idx} className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                          <span className="badge" style={{ background: GAP_COL[String(g.color).toLowerCase()] || '#64748b' }}>
                                            {g.color}
                                          </span>
                                          <strong>{g.skillName}</strong>
                                          <span className="text-body-secondary">
                                            need {String(g.requiredLevel)} · have {String(g.currentLevel)}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <div className="fw-semibold mb-2 mt-3">Manager assessment (workflow)</div>
                                  <div className="row g-2 align-items-end small" onClick={(ev) => ev.stopPropagation()}>
                                    <div className="col-md-4">
                                      <label className="form-label">Skill</label>
                                      <select
                                        className="form-select form-select-sm"
                                        value={mgrAssess.skillId}
                                        onChange={(ev) => setMgrAssess((s) => ({ ...s, skillId: ev.target.value }))}
                                      >
                                        <option value="">Select…</option>
                                        {[...(e.skills || []), ...(e.topGaps || [])]
                                          .filter((x) => x.skillId != null)
                                          .filter((x, i, arr) => arr.findIndex((y) => y.skillId === x.skillId) === i)
                                          .map((x) => (
                                            <option key={x.skillId} value={x.skillId}>
                                              {x.skillName}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                    <div className="col-md-3">
                                      <label className="form-label">Your rating</label>
                                      <select
                                        className="form-select form-select-sm"
                                        value={mgrAssess.level}
                                        onChange={(ev) => setMgrAssess((s) => ({ ...s, level: ev.target.value }))}
                                      >
                                        {SKILL_LEVELS.map((lv) => (
                                          <option key={lv} value={lv}>
                                            {lv}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="col-md-3">
                                      <label className="form-label">Note</label>
                                      <input
                                        className="form-control form-control-sm"
                                        value={mgrAssess.note}
                                        onChange={(ev) => setMgrAssess((s) => ({ ...s, note: ev.target.value }))}
                                        placeholder="Optional"
                                      />
                                    </div>
                                    <div className="col-md-2">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary w-100"
                                        disabled={busy}
                                        onClick={() => submitManagerAssessment(e.employeeId)}
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                  <p className="small text-body-secondary mt-2 mb-0">
                                    <i className="bi bi-info-circle me-1" />
                                    Row click toggles this panel. Severity sums gap ranks (lower is better).
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </RoleTable>
                <p className="small text-body-secondary mt-2 mb-0">{perf.notes}</p>
              </RoleCard>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-xl-5">
              <RoleCard id="approvals" title="Training approvals" iconClass="bi-check2-circle">
                {pending.length === 0 ? (
                  <div className="text-center py-4 text-body-secondary">
                    <i className="bi bi-check-circle display-6 d-block mb-2 opacity-50" />
                    <p className="mb-0">Queue is clear — no requests waiting on you.</p>
                  </div>
                ) : (
                  pending.map((p) => (
                    <div key={p.id} className="card border mb-2 mgr-approval-card">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                          <div>
                            <div className="fw-semibold">{p.programTitle}</div>
                            <div className="small text-body-secondary">
                              {p.employeeName} · requested {String(p.requestedAt).slice(0, 10)}
                            </div>
                          </div>
                          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => approveTraining(p.id)}>
                            <i className="bi bi-check-lg me-1" />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </RoleCard>
            </div>
            <div className="col-xl-7">
              <RoleCard id="projects" title="Project staffing" iconClass="bi-diagram-3-fill" headerRight={<span className="small text-body-secondary">Dept assignees per project</span>}>
                <div className="row g-2 mb-3">
                  {(projectCoverage || []).map((pr) => (
                    <div className="col-md-6" key={pr.id}>
                      <button
                        type="button"
                        className={`btn btn-link text-start text-decoration-none p-0 w-100 mgr-project-pill`}
                        onClick={() => {
                          setAllocProjectId(String(pr.id))
                          document.getElementById('allocate-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}
                      >
                        <div className="border rounded-3 p-3 h-100 text-dark mgr-project-pill__inner">
                          <div className="fw-semibold text-truncate">{pr.name}</div>
                          <div className="small text-body-secondary text-truncate">{pr.requiredJobRoleName || 'Any role'}</div>
                          <div className="mt-2 small">
                            <span className="badge text-bg-primary">{pr.assigneesInMyDept ?? 0} in your dept</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                  {projectCoverage.length === 0 && <p className="text-body-secondary small mb-0">No projects yet — ask HR or admin to create one.</p>}
                </div>

                <div id="allocate-form" className="border rounded-3 p-3 bg-body-secondary bg-opacity-25">
                  <div className="fw-semibold mb-2">
                    <i className="bi bi-cpu-fill me-1 text-primary" />
                    Auto-allocate from your department
                  </div>
                  <form onSubmit={runAllocate} className="row g-2 align-items-end">
                    <div className="col-md-5">
                      <label className="form-label small text-body-secondary">Project</label>
                      <select
                        className="form-select"
                        value={allocProjectId}
                        onChange={(e) => {
                          setAllocProjectId(e.target.value)
                          setStaffProjectId(e.target.value)
                        }}
                      >
                        {projects.length === 0 ? (
                          <option value="">No projects</option>
                        ) : (
                          projects.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                              {pr.name} {pr.requiredJobRoleName ? `· ${pr.requiredJobRoleName}` : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small text-body-secondary">Max assignees</label>
                      <input type="number" className="form-control" min={1} max={50} value={maxAssignees} onChange={(e) => setMaxAssignees(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-primary w-100" type="submit" disabled={busy || !projects.length}>
                        {busy ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" />
                            Allocating…
                          </>
                        ) : (
                          <>
                            <i className="bi bi-magic me-1" />
                            Run matcher
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                  <p className="small text-body-secondary mt-2 mb-0">
                    Ranks employees by total skill-gap score against the project&apos;s required job role and assigns the best fits (employees only).
                  </p>
                  <div className="border-top pt-3 mt-3">
                    <div className="fw-semibold mb-2">
                      <i className="bi bi-arrows-move me-1" />
                      Drag-and-drop staffing order
                    </div>
                    <p className="small text-body-secondary mb-2">
                      Reorder people on this project (your department). Order syncs when you release the row.
                    </p>
                    {staffRows.length === 0 ? (
                      <p className="small text-body-secondary mb-0">No dept assignees for the selected project.</p>
                    ) : (
                      <ul className="list-group list-group-flush border rounded-2">
                        {staffRows.map((r, idx) => (
                          <li
                            key={r.assignmentId}
                            className="list-group-item d-flex justify-content-between align-items-center py-2"
                            draggable
                            onDragStart={() => onStaffDragStart(idx)}
                            onDragOver={(ev) => onStaffDragOver(ev, idx)}
                            onDragEnd={onStaffDragEnd}
                          >
                            <span>
                              <i className="bi bi-grip-vertical me-2 text-body-secondary" aria-hidden />
                              {r.employeeName}
                            </span>
                            <span className="badge text-bg-light text-dark border">#{idx + 1}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </RoleCard>
            </div>
          </div>

          <div className="row g-3 mb-2" id="performance">
            <div className="col-12">
              <RoleCard title="Readiness by person" iconClass="bi-bar-chart-line-fill">
                <p className="small text-body-secondary mb-3">Each bar shows how much of that person&apos;s required-skill checks are already green.</p>
                <div className="d-flex flex-column gap-2">
                  {team.map((e) => {
                    const gc = e.gapCounts || {}
                    const total = (gc.green || 0) + (gc.yellow || 0) + (gc.orange || 0) + (gc.red || 0) || 1
                    const greenPct = ((gc.green || 0) / total) * 100
                    return (
                      <div key={e.employeeId} className="mgr-person-bar">
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="fw-medium text-truncate me-2">{e.name}</span>
                          <span className="text-body-secondary text-nowrap">{Math.round(greenPct)}% green</span>
                        </div>
                        <div className="rounded-pill overflow-hidden d-flex" style={{ height: 10, background: 'var(--bs-secondary-bg)' }}>
                          <div style={{ width: `${greenPct}%`, background: GAP_COL.green }} />
                          <div style={{ width: `${((gc.yellow || 0) / total) * 100}%`, background: GAP_COL.yellow }} />
                          <div style={{ width: `${((gc.orange || 0) / total) * 100}%`, background: GAP_COL.orange }} />
                          <div style={{ width: `${((gc.red || 0) / total) * 100}%`, background: GAP_COL.red }} />
                        </div>
                      </div>
                    )
                  })}
                  {team.length === 0 && <p className="text-body-secondary small mb-0">No team members in this department.</p>}
                </div>
              </RoleCard>
            </div>
          </div>

          <CsgtsModuleMap role="MANAGER" />
        </>
      )}
    </div>
  )
}

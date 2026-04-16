import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'
import { MANAGER_SIDEBAR_ITEMS } from './dashboard/dashboardNavConfig.js'
import { RoleAlerts, RoleCard, RoleLoading, RoleTable } from './dashboard/dashboardRoleUi.jsx'
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
    <div className="mgr-gap-stack rounded-3 overflow-hidden d-flex" title={`G ${g} · Y ${y} · O ${o} · R ${r}`}>
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
        background: `conic-gradient(hsl(${hue}, 78%, 52%) ${s * 3.6}deg, rgba(255,255,255,0.12) 0)`
      }}
      title={`Readiness ${s}%`}
    >
      <div className="mgr-readiness-ring__inner">
        <span className="fw-bold fs-4">{s}</span>
        <span className="small text-white-50">/ 100</span>
      </div>
    </div>
  )
}

function managerInitials(name) {
  if (!name || !String(name).trim()) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function deptConicGradient(aggregate) {
  const g = aggregate?.green || 0
  const y = aggregate?.yellow || 0
  const o = aggregate?.orange || 0
  const r = aggregate?.red || 0
  const t = g + y + o + r
  if (t === 0) return null
  let cursor = 0
  const seg = (n, col) => {
    if (n <= 0) return ''
    const deg = (n / t) * 360
    const start = cursor
    cursor += deg
    return `${col} ${start}deg ${cursor}deg`
  }
  const parts = [seg(g, GAP_COL.green), seg(y, GAP_COL.yellow), seg(o, GAP_COL.orange), seg(r, GAP_COL.red)].filter(Boolean)
  return { gradient: `conic-gradient(${parts.join(', ')})`, total: t }
}

function DeptCompetencyDonut({ aggregate }) {
  const built = deptConicGradient(aggregate)
  if (!built) {
    return (
      <div className="mgr-donut mgr-donut--empty d-flex align-items-center justify-content-center text-body-secondary small">
        No mapped skills yet
      </div>
    )
  }
  return (
    <div className="mgr-donut-wrap">
      <div className="mgr-donut" style={{ background: built.gradient }} aria-hidden>
        <div className="mgr-donut__hole">
          <span className="mgr-donut__value">{built.total}</span>
          <span className="mgr-donut__label">gap checks</span>
        </div>
      </div>
    </div>
  )
}

function ManagerSectionNav({ active }) {
  return (
    <nav className="mgr-cmd-nav" aria-label="Manager sections">
      <div className="mgr-cmd-nav__track">
        {MANAGER_SIDEBAR_ITEMS.map((item) => {
          const to = item.hash ? `/manager#${item.hash}` : '/manager'
          const isActive = item.hash ? active === item.hash : active === 'overview'
          return (
            <Link key={item.id} to={to} className={`mgr-nav-pill${isActive ? ' mgr-nav-pill--active' : ''}`}>
              <i className={`bi ${item.icon}`} aria-hidden />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

const PIPELINE_STEPS = [
  { key: 'REQUESTED', label: 'Awaiting you', sub: 'Manager review', tone: 'mgr-step--req' },
  { key: 'APPROVED', label: 'Approved', sub: 'HR enrollment', tone: 'mgr-step--ok' },
  { key: 'REJECTED', label: 'Rejected', sub: 'Closed path', tone: 'mgr-step--no' },
  { key: 'COMPLETED', label: 'Completed', sub: 'Finished', tone: 'mgr-step--done' }
]

function TrainingPipelinePro({ pipeline }) {
  return (
    <ol className="mgr-pipeline list-unstyled mb-0">
      {PIPELINE_STEPS.map((step, i) => {
        const n = pipeline[step.key] ?? 0
        return (
          <li key={step.key} className={`mgr-pipeline__step ${step.tone}`}>
            <div className="mgr-pipeline__rail" aria-hidden>
              {i < PIPELINE_STEPS.length - 1 ? <span className="mgr-pipeline__line" /> : null}
              <span className="mgr-pipeline__dot" />
            </div>
            <div className="mgr-pipeline__body">
              <div className="d-flex justify-content-between align-items-baseline gap-2 flex-wrap">
                <span className="fw-semibold">{step.label}</span>
                <span className="mgr-pipeline__count">{n}</span>
              </div>
              <div className="small text-body-secondary">{step.sub}</div>
            </div>
          </li>
        )
      })}
    </ol>
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

const MGR_SECTION_IDS = ['overview', 'insights', 'team', 'approvals', 'projects', 'performance']

export default function ManagerDashboard() {
  const { hash } = useLocation()
  const activeSection = useMemo(() => {
    const h = (hash || '').replace(/^#/, '')
    return MGR_SECTION_IDS.includes(h) ? h : 'overview'
  }, [hash])
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
  const [deadlineDrafts, setDeadlineDrafts] = useState({})
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
      setDeadlineDrafts((prev) => {
        const next = { ...prev }
        for (const p of plist) {
          next[String(p.id)] = p.deadlineAt ? String(p.deadlineAt).slice(0, 10) : ''
        }
        return next
      })
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

  async function saveProjectDeadline() {
    if (!allocProjectId) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await api.put(`/api/manager/projects/${allocProjectId}/deadline`, {
        deadlineDate: deadlineDrafts[String(allocProjectId)] || null
      })
      await load()
      setSuccess('Project deadline updated.')
    } catch (err) {
      setError(err?.response?.data?.error || 'DEADLINE_UPDATE_FAILED')
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
  const selectedProject = useMemo(
    () => projects.find((p) => String(p.id) === String(allocProjectId)) || null,
    [projects, allocProjectId]
  )
  const managerIntel = data?.managerIntelligence || {}
  const weightedScores = managerIntel?.weightedTeamScores || []
  const riskAlerts = managerIntel?.riskAlerts || []
  const aiSuggestions = managerIntel?.aiSuggestions || {}

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
          <div className="row g-0 mb-0" id="overview">
            <div className="col-12">
              <div className="card mgr-hero mgr-hero--pro border-0 overflow-hidden mb-0 rounded-bottom-0">
                <div className="card-body p-4 p-lg-5 text-white position-relative">
                  <div className="row align-items-center g-4">
                    <div className="col-lg-7">
                      <div className="d-flex align-items-start gap-3 gap-lg-4">
                        <div className="mgr-hero-avatar mgr-hero-avatar--glow" aria-hidden>
                          <i className="bi bi-command fs-3" />
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <p className="mgr-hero-eyebrow mb-2">AI-CSGTS · Manager workspace</p>
                          <h1 className="mgr-hero-title h2 mb-3">Team command center</h1>
                          <p className="mgr-hero-lead mb-4">
                            Readiness, competency risk, training workflow, and staffing for{' '}
                            <strong className="text-white">{dept?.name || 'your department'}</strong>. Drill into the roster for
                            coaching; use staffing tools when projects need the best-fit people.
                          </p>
                          <div className="mgr-hero-chips d-flex flex-wrap gap-2">
                            <span className="mgr-chip">
                              <i className="bi bi-people-fill me-1" aria-hidden />
                              {perf.directReportsCount ?? perf.totalEmployees ?? team.length} direct reports
                            </span>
                            <span className="mgr-chip">
                              <i className="bi bi-mortarboard me-1" aria-hidden />
                              {perf.trainingCompletedInDept ?? 0} trainings completed
                            </span>
                            <span className="mgr-chip mgr-chip--accent">
                              <i className="bi bi-inbox-fill me-1" aria-hidden />
                              {pending.length} awaiting your review
                            </span>
                            <span className="mgr-chip">
                              <i className="bi bi-kanban me-1" aria-hidden />
                              {projects.length} active projects
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-5">
                      <div className="mgr-hero-panel ms-lg-auto">
                        <div className="d-flex align-items-center gap-3 flex-wrap flex-lg-nowrap">
                          <ReadinessRing score={readiness} />
                          <div className="flex-grow-1 min-w-0">
                            <div className="text-uppercase small fw-semibold text-white-50 mb-1">Department readiness</div>
                            <div className="fs-5 fw-bold mb-1">{readiness}% index</div>
                            <p className="small text-white-50 mb-2 mb-lg-3">Weighted green coverage vs. required role skills.</p>
                            <div className="d-flex align-items-center gap-2 mgr-hero-risk">
                              <span className="mgr-risk-dot" />
                              <span>
                                <strong className="text-warning">{atRisk}</strong>
                                <span className="text-white-50"> with critical gaps</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <ManagerSectionNav active={activeSection} />
            </div>
          </div>

          <div className="row g-3 mb-3 mgr-metrics-row">
            <div className="col-6 col-xl">
              <div className="mgr-metric-tile">
                <span className="mgr-metric-tile__icon text-primary">
                  <i className="bi bi-people-fill" aria-hidden />
                </span>
                <div className="mgr-metric-tile__body">
                  <span className="mgr-metric-tile__value">{team.length}</span>
                  <span className="mgr-metric-tile__label">Direct reports</span>
                </div>
              </div>
            </div>
            <div className="col-6 col-xl">
              <div className="mgr-metric-tile">
                <span className="mgr-metric-tile__icon text-success">
                  <i className="bi bi-speedometer2" aria-hidden />
                </span>
                <div className="mgr-metric-tile__body">
                  <span className="mgr-metric-tile__value">{readiness}%</span>
                  <span className="mgr-metric-tile__label">Readiness index</span>
                </div>
              </div>
            </div>
            <div className="col-6 col-xl">
              <div className="mgr-metric-tile mgr-metric-tile--danger">
                <span className="mgr-metric-tile__icon text-danger">
                  <i className="bi bi-heart-pulse-fill" aria-hidden />
                </span>
                <div className="mgr-metric-tile__body">
                  <span className="mgr-metric-tile__value">{atRisk}</span>
                  <span className="mgr-metric-tile__label">At-risk (red gaps)</span>
                </div>
              </div>
            </div>
            <div className="col-6 col-xl">
              <div className="mgr-metric-tile mgr-metric-tile--warning">
                <span className="mgr-metric-tile__icon text-warning">
                  <i className="bi bi-hourglass-split" aria-hidden />
                </span>
                <div className="mgr-metric-tile__body">
                  <span className="mgr-metric-tile__value">{pending.length}</span>
                  <span className="mgr-metric-tile__label">Training queue</span>
                </div>
              </div>
            </div>
            <div className="col-6 col-xl">
              <div className="mgr-metric-tile">
                <span className="mgr-metric-tile__icon text-info">
                  <i className="bi bi-kanban-fill" aria-hidden />
                </span>
                <div className="mgr-metric-tile__body">
                  <span className="mgr-metric-tile__value">{projects.length}</span>
                  <span className="mgr-metric-tile__label">Projects</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3" id="insights">
            <div className="col-xl-7">
              <RoleCard className="mgr-surface-card border-0 shadow-sm" title="Competency spectrum" iconClass="bi-layers-half">
                <p className="small text-body-secondary mb-4">
                  Aggregate gap distribution across <strong>{dept?.name || 'the department'}</strong> — use it to prioritize team-wide initiatives.
                </p>
                <div className="row g-4 align-items-center">
                  <div className="col-sm-auto d-flex justify-content-center">
                    <DeptCompetencyDonut aggregate={aggregate} />
                  </div>
                  <div className="col">
                    <GapDistributionBar aggregate={aggregate} />
                    <p className="small text-body-secondary mt-2 mb-3">Relative share of required-skill checks by severity.</p>
                    <div className="mgr-legend-grid">
                      {[
                        ['green', 'On target'],
                        ['yellow', 'Watch'],
                        ['orange', 'Meaningful gap'],
                        ['red', 'Critical gap']
                      ].map(([k, lab]) => (
                        <div key={k} className="mgr-legend-item">
                          <span className="mgr-legend-swatch" style={{ background: GAP_COL[k] }} />
                          <span className="small">{lab}</span>
                          <strong className="ms-auto">{aggregate[k] ?? 0}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </RoleCard>
            </div>
            <div className="col-xl-5">
              <RoleCard className="mgr-surface-card border-0 shadow-sm" title="Training pipeline" iconClass="bi-diagram-3-fill">
                <p className="small text-body-secondary mb-3">Department assignments — every stage in one glance.</p>
                <TrainingPipelinePro pipeline={pipeline} />
              </RoleCard>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-xl-4">
              <RoleCard className="mgr-surface-card border-0 shadow-sm" title="Coverage index" iconClass="bi-shield-check">
                <div className="display-6 fw-bold mb-1">{managerIntel?.teamSkillCoverageIndex ?? 0}%</div>
                <p className="small text-body-secondary mb-2">{managerIntel?.coverageFormula || 'coverage = available_skills / required_skills * 100'}</p>
                <p className="small mb-0">Measures available vs required team skill coverage.</p>
              </RoleCard>
            </div>
            <div className="col-xl-4">
              <RoleCard className="mgr-surface-card border-0 shadow-sm" title="Skill risk detection" iconClass="bi-exclamation-triangle-fill">
                {riskAlerts.length === 0 ? (
                  <p className="small mb-0 text-success">No active risk alerts under current thresholds.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {riskAlerts.slice(0, 3).map((r) => (
                      <li key={r.projectId} className="list-group-item px-0 bg-transparent">
                        <div className="fw-semibold">{r.projectName}</div>
                        <div className="small text-body-secondary">{r.message}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </RoleCard>
            </div>
            <div className="col-xl-4">
              <RoleCard className="mgr-surface-card border-0 shadow-sm" title="AI team optimizer" iconClass="bi-cpu-fill">
                <p className="small mb-1">Predicted failure risk: <strong>{aiSuggestions?.teamFailureRisk || 'LOW'}</strong></p>
                <p className="small text-body-secondary mb-2">{managerIntel?.weightedFormula || ''}</p>
                <ul className="small mb-0">
                  {(aiSuggestions?.teamRestructuringOptions || []).slice(0, 2).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </RoleCard>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-xl-6">
              <RoleCard className="mgr-surface-card border-0 shadow-sm" title="Performance weighting" iconClass="bi-sliders2-vertical">
                {weightedScores.length === 0 ? (
                  <p className="small text-body-secondary mb-0">No weighted scores yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Employee</th>
                          <th>Manager</th>
                          <th>Final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weightedScores.slice(0, 8).map((w) => (
                          <tr key={w.employeeId}>
                            <td>{w.employeeName}</td>
                            <td>{w.employeeScore}%</td>
                            <td>{w.managerScore}%</td>
                            <td className="fw-semibold">{w.finalSkillScore}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </RoleCard>
            </div>
            <div className="col-xl-6">
              <RoleCard className="mgr-surface-card border-0 shadow-sm" title="Best-fit staffing suggestions" iconClass="bi-person-check-fill">
                {(aiSuggestions?.bestFitEmployeesByProject || []).length === 0 ? (
                  <p className="small text-body-secondary mb-0">No project fit suggestions yet.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {(aiSuggestions?.bestFitEmployeesByProject || []).slice(0, 3).map((p) => (
                      <div key={p.projectId} className="border rounded p-2">
                        <div className="fw-semibold">{p.projectName}</div>
                        <div className="small text-body-secondary">
                          Best fit: {(p.bestFits || []).map((b) => b.employeeName).join(', ') || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </RoleCard>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12">
              <RoleCard
                className="mgr-surface-card border-0 shadow-sm"
                id="team"
                title="Team roster & coaching"
                iconClass="bi-people-fill"
                headerRight={
                  <span className="mgr-roster-badge">
                    <i className="bi bi-funnel me-1" aria-hidden />
                    {sortedTeam.length} shown
                  </span>
                }
              >
                <div className="row g-2 mb-3 align-items-center">
                  <div className="col-md-6 col-lg-5">
                    <div className="mgr-search-wrap">
                      <i className="bi bi-search mgr-search-wrap__icon" aria-hidden />
                      <input
                        type="search"
                        className="form-control form-control-sm mgr-search-input"
                        placeholder="Search name, email, or role…"
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        aria-label="Filter team"
                      />
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-7 text-md-end">
                    <button type="button" className="btn btn-sm mgr-btn-ghost" disabled={busy} onClick={() => load()}>
                      <i className="bi bi-arrow-clockwise me-1" />
                      Refresh data
                    </button>
                  </div>
                </div>
                <RoleTable>
                  <thead>
                    <tr>
                      <th className="text-center" style={{ width: 48 }} aria-hidden>
                        #
                      </th>
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
                    {sortedTeam.map((e, rowIdx) => {
                      const tier = healthTier(e.gapCounts)
                      const open = expandedId === e.employeeId
                      return (
                        <React.Fragment key={e.employeeId}>
                          <tr
                            className={`mgr-team-row${open ? ' mgr-team-row--open' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setExpandedId(open ? null : e.employeeId)}
                          >
                            <td className="text-center text-body-secondary small">{rowIdx + 1}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2 min-w-0">
                                <span className="mgr-team-avatar flex-shrink-0" title={e.name}>
                                  {managerInitials(e.name)}
                                </span>
                                <div className="min-w-0">
                                  <strong className="d-block text-truncate">{e.name}</strong>
                                  <div className="small text-body-secondary text-truncate">{e.email}</div>
                                </div>
                              </div>
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
                            <tr className="mgr-team-expand">
                              <td colSpan={10} className="border-top-0 pt-0 p-0">
                                <div className="mgr-expand-panel m-2 p-3 rounded-3">
                                  <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                                    <span className="mgr-expand-icon">
                                      <i className="bi bi-lightning-charge-fill" aria-hidden />
                                    </span>
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
                                  <div className="fw-semibold mb-2 mt-3 pt-2 border-top border-opacity-10">Manager assessment</div>
                                  <div className="row g-2 align-items-end small" onClick={(ev) => ev.stopPropagation()}>
                                    <div className="col-md-4">
                                      <label className="form-label">Skill</label>
                                      <select
                                        className="form-select form-select-sm mgr-form-soft"
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
                                        className="form-select form-select-sm mgr-form-soft"
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
                                        className="form-control form-control-sm mgr-form-soft"
                                        value={mgrAssess.note}
                                        onChange={(ev) => setMgrAssess((s) => ({ ...s, note: ev.target.value }))}
                                        placeholder="Optional"
                                      />
                                    </div>
                                    <div className="col-md-2">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary w-100 rounded-pill"
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
              <RoleCard className="mgr-surface-card border-0 shadow-sm" id="approvals" title="Training approvals" iconClass="bi-check2-circle">
                {pending.length === 0 ? (
                  <div className="mgr-empty-state text-center py-5">
                    <div className="mgr-empty-state__icon">
                      <i className="bi bi-check2-all" aria-hidden />
                    </div>
                    <p className="fw-semibold mb-1">Inbox zero</p>
                    <p className="small text-body-secondary mb-0">No training requests are waiting on your approval.</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {pending.map((p) => (
                      <div key={p.id} className="mgr-approval-card">
                        <div className="mgr-approval-card__body">
                          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                            <div className="min-w-0">
                              <div className="fw-semibold text-truncate">{p.programTitle}</div>
                              <div className="small text-body-secondary">
                                <i className="bi bi-person me-1" aria-hidden />
                                {p.employeeName}
                                <span className="text-body-tertiary mx-1">·</span>
                                {String(p.requestedAt).slice(0, 10)}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary rounded-pill px-3 flex-shrink-0"
                              disabled={busy}
                              onClick={() => approveTraining(p.id)}
                            >
                              <i className="bi bi-check-lg me-1" />
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </RoleCard>
            </div>
            <div className="col-xl-7">
              <RoleCard
                className="mgr-surface-card border-0 shadow-sm"
                id="projects"
                title="Project staffing"
                iconClass="bi-diagram-3-fill"
                headerRight={<span className="mgr-roster-badge">Dept coverage</span>}
              >
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
                          <div className="small text-body-secondary mt-1">
                            Deadline: {pr.deadlineAt ? String(pr.deadlineAt).slice(0, 10) : 'Not set'} · {pr.daysToDeadline ?? '-'} day(s)
                          </div>
                          <div className="mt-2 small">
                            <span className="badge text-bg-primary">{pr.assigneesInMyDept ?? 0} in your dept</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                  {projectCoverage.length === 0 && <p className="text-body-secondary small mb-0">No projects yet — ask HR or admin to create one.</p>}
                </div>

                <div id="allocate-form" className="mgr-allocate-panel rounded-3 p-3 p-md-4">
                  <div className="fw-semibold mb-3 d-flex align-items-center gap-2">
                    <span className="mgr-expand-icon mgr-expand-icon--soft">
                      <i className="bi bi-cpu-fill" aria-hidden />
                    </span>
                    Auto-allocate from your department
                  </div>
                  <form onSubmit={runAllocate} className="row g-2 align-items-end">
                    <div className="col-md-5">
                      <label className="form-label small text-body-secondary">Project</label>
                      <select
                        className="form-select mgr-form-soft"
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
                      <input
                        type="number"
                        className="form-control mgr-form-soft"
                        min={1}
                        max={50}
                        value={maxAssignees}
                        onChange={(e) => setMaxAssignees(e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-primary w-100 rounded-pill" type="submit" disabled={busy || !projects.length}>
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
                  <div className="row g-2 align-items-end mt-1">
                    <div className="col-md-5">
                      <label className="form-label small text-body-secondary">Project deadline</label>
                      <input
                        type="date"
                        className="form-control mgr-form-soft"
                        value={deadlineDrafts[String(allocProjectId)] || ''}
                        onChange={(e) =>
                          setDeadlineDrafts((prev) => ({ ...prev, [String(allocProjectId)]: e.target.value }))
                        }
                        disabled={!allocProjectId}
                      />
                      <div className="small text-body-secondary mt-1">
                        Current: {selectedProject?.deadlineAt ? String(selectedProject.deadlineAt).slice(0, 10) : 'Not set'}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary w-100 rounded-pill"
                        disabled={busy || !allocProjectId}
                        onClick={saveProjectDeadline}
                      >
                        <i className="bi bi-calendar-check me-1" />
                        Save deadline
                      </button>
                    </div>
                  </div>
                  <p className="small text-body-secondary mt-2 mb-0">
                    Ranks employees by total skill-gap score against the project&apos;s required job role and assigns the best fits (employees only).
                  </p>
                  <div className="border-top border-opacity-10 pt-3 mt-3">
                    <div className="fw-semibold mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-arrows-move text-primary" aria-hidden />
                      Drag-and-drop staffing order
                    </div>
                    <p className="small text-body-secondary mb-3">
                      Reorder people on this project (your department). Order syncs when you release the row.
                    </p>
                    {staffRows.length === 0 ? (
                      <p className="small text-body-secondary mb-0">No dept assignees for the selected project.</p>
                    ) : (
                      <ul className="list-group list-group-flush mgr-drag-list rounded-3 overflow-hidden">
                        {staffRows.map((r, idx) => (
                          <li
                            key={r.assignmentId}
                            className="list-group-item d-flex justify-content-between align-items-center py-2 mgr-drag-item"
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
              <RoleCard className="mgr-surface-card border-0 shadow-sm" title="Readiness by person" iconClass="bi-bar-chart-line-fill">
                <p className="small text-body-secondary mb-4">
                  Stacked bars: share of required-skill checks that are green, watch, meaningful gap, or critical — per team member.
                </p>
                <div className="d-flex flex-column gap-3">
                  {team.map((e) => {
                    const gc = e.gapCounts || {}
                    const total = (gc.green || 0) + (gc.yellow || 0) + (gc.orange || 0) + (gc.red || 0) || 1
                    const greenPct = ((gc.green || 0) / total) * 100
                    return (
                      <div key={e.employeeId} className="mgr-person-bar mgr-person-bar--pro">
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2 min-w-0">
                            <span className="mgr-team-avatar mgr-team-avatar--sm flex-shrink-0">{managerInitials(e.name)}</span>
                            <span className="fw-medium text-truncate">{e.name}</span>
                          </div>
                          <span className="mgr-person-bar__pct text-nowrap">{Math.round(greenPct)}% on target</span>
                        </div>
                        <div className="mgr-stack-bar rounded-pill overflow-hidden d-flex" title="G / Y / O / R mix">
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
        </>
      )}
    </div>
  )
}

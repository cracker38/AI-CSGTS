import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { RoleAlerts, RoleCard, RoleTable, SmallBoxKpi } from './dashboard/dashboardRoleUi.jsx'

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']

const TAB_CONFIG = [
  { id: 'overview', label: 'Overview', icon: 'bi-speedometer2' },
  { id: 'people', label: 'Employees', icon: 'bi-people' },
  { id: 'taxonomy', label: 'Skill taxonomy', icon: 'bi-diagram-3' },
  { id: 'training', label: 'Training programs', icon: 'bi-journal-bookmark' },
  { id: 'workflows', label: 'Approvals & requests', icon: 'bi-inboxes' }
]

export default function HrDashboard() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [employees, setEmployees] = useState([])
  const [skills, setSkills] = useState([])
  const [jobRoles, setJobRoles] = useState([])
  const [trainingPrograms, setTrainingPrograms] = useState([])
  const [assignments, setAssignments] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const [newSkill, setNewSkill] = useState('')
  const [newRole, setNewRole] = useState('')
  const [reqRoleId, setReqRoleId] = useState('')
  const [reqSkillId, setReqSkillId] = useState('')
  const [reqLevel, setReqLevel] = useState('INTERMEDIATE')

  const [tpTitle, setTpTitle] = useState('')
  const [tpDesc, setTpDesc] = useState('')
  const [tpSkillId, setTpSkillId] = useState('')
  const [tpLevel, setTpLevel] = useState('INTERMEDIATE')

  const [asEmp, setAsEmp] = useState('')
  const [asProg, setAsProg] = useState('')

  async function loadAll() {
    setError('')
    const [st, empRes, skillsRes, rolesRes, trainingsRes, asRes] = await Promise.all([
      api.get('/api/hr/stats'),
      api.get('/api/hr/employees'),
      api.get('/api/hr/skills'),
      api.get('/api/hr/job-roles'),
      api.get('/api/hr/training-programs'),
      api.get('/api/hr/training-assignments')
    ])
    setStats(st.data)
    setEmployees(empRes.data)
    setSkills(skillsRes.data)
    setJobRoles(rolesRes.data)
    setTrainingPrograms(trainingsRes.data)
    setAssignments(asRes.data)
    if (rolesRes.data.length && !reqRoleId) setReqRoleId(String(rolesRes.data[0].id))
    if (skillsRes.data.length && !reqSkillId) setReqSkillId(String(skillsRes.data[0].id))
    if (skillsRes.data.length && !tpSkillId) setTpSkillId(String(skillsRes.data[0].id))
    const emps = (empRes.data || []).filter((u) => u.role === 'EMPLOYEE')
    if (emps.length && !asEmp) setAsEmp(String(emps[0].id))
    if (trainingsRes.data.length && !asProg) setAsProg(String(trainingsRes.data[0].id))
  }

  useEffect(() => {
    loadAll().catch((e) => setError(e?.response?.data?.error || 'FAILED_TO_LOAD_HR_DASHBOARD'))
  }, [])

  useEffect(() => {
    const sync = () => {
      const h = (window.location.hash || '').replace(/^#/, '')
      if (h === 'workflows') setTab('workflows')
      if (h === 'training') setTab('training')
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    const h = (window.location.hash || '').replace(/^#/, '')
    if (tab !== 'workflows' || h !== 'workflows') return
    const t = window.setTimeout(() => {
      document.getElementById('workflows')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)
    return () => clearTimeout(t)
  }, [tab])

  async function toggleActive(id, active) {
    setBusy(true)
    setMsg('')
    try {
      await api.patch(`/api/hr/employees/${id}/activate`, { active: !active })
      await loadAll()
      setMsg('Employee status updated.')
    } catch (e) {
      setError(e?.response?.data?.error || 'UPDATE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function createSkill(e) {
    e.preventDefault()
    if (!newSkill.trim()) return
    setBusy(true)
    try {
      await api.post('/api/hr/skills', { name: newSkill.trim() })
      setNewSkill('')
      await loadAll()
      setMsg('Skill created.')
    } catch (e) {
      setError(e?.response?.data?.error || 'CREATE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function createJobRole(e) {
    e.preventDefault()
    if (!newRole.trim()) return
    setBusy(true)
    try {
      await api.post('/api/hr/job-roles', { name: newRole.trim() })
      setNewRole('')
      await loadAll()
      setMsg('Job role created.')
    } catch (e) {
      setError(e?.response?.data?.error || 'CREATE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function addRequired(e) {
    e.preventDefault()
    if (!reqRoleId || !reqSkillId) return
    setBusy(true)
    try {
      await api.post(`/api/hr/job-roles/${reqRoleId}/required-skills`, {
        skillId: Number(reqSkillId),
        requiredLevel: reqLevel
      })
      await loadAll()
      setMsg('Required skill linked to job role.')
    } catch (e) {
      setError(e?.response?.data?.error || 'LINK_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function createTraining(e) {
    e.preventDefault()
    if (!tpTitle.trim() || !tpSkillId) return
    setBusy(true)
    try {
      await api.post('/api/hr/training-programs', {
        title: tpTitle.trim(),
        description: tpDesc,
        skillId: Number(tpSkillId),
        targetLevel: tpLevel
      })
      setTpTitle('')
      setTpDesc('')
      await loadAll()
      setMsg('Training program created.')
    } catch (e) {
      setError(e?.response?.data?.error || 'CREATE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function assignTraining(e) {
    e.preventDefault()
    if (!asEmp || !asProg) return
    setBusy(true)
    try {
      await api.post('/api/hr/training-assignments', {
        employeeId: Number(asEmp),
        programId: Number(asProg)
      })
      await loadAll()
      setMsg('Training assigned (pending approvals).')
    } catch (e) {
      setError(e?.response?.data?.error || 'ASSIGN_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function approveAsg(id) {
    setBusy(true)
    try {
      await api.post(`/api/hr/training-assignments/${id}/approve`, {})
      await loadAll()
    } catch (e) {
      setError(e?.response?.data?.error || 'APPROVE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function rejectAsg(id) {
    setBusy(true)
    try {
      await api.post(`/api/hr/training-assignments/${id}/reject`, {})
      await loadAll()
    } catch (e) {
      setError(e?.response?.data?.error || 'REJECT_FAILED')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="card bg-danger bg-gradient text-white mb-3 shadow-sm">
        <div className="card-body py-3">
          <div className="d-flex align-items-center gap-3">
            <span className="rounded-2 bg-white bg-opacity-25 px-3 py-2 fw-bold">HR</span>
            <div>
              <h2 className="h5 mb-0">HR intelligence hub</h2>
              <p className="mb-0 small opacity-90">
                Workforce taxonomy, training lifecycle, activations, and organization analytics.
              </p>
            </div>
          </div>
        </div>
      </div>

      <RoleAlerts error={error} success={msg} />

      <ul className="nav nav-tabs flex-nowrap overflow-auto mb-3 border-bottom">
        {TAB_CONFIG.map(({ id, label, icon }) => (
          <li className="nav-item" key={id}>
            <button
              type="button"
              className={`nav-link d-flex align-items-center gap-1 ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <i className={`bi ${icon}`} aria-hidden />
              {label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'overview' && stats && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-lg-4 col-md-6">
              <SmallBoxKpi value={stats.totalUsers} label="Total users" variant="primary" iconClass="bi-people" />
            </div>
            <div className="col-lg-4 col-md-6">
              <SmallBoxKpi value={stats.activeUsers} label="Active accounts" variant="success" iconClass="bi-person-check" />
            </div>
            <div className="col-lg-4 col-md-6">
              <SmallBoxKpi value={stats.skillsInTaxonomy} label="Skills in taxonomy" variant="info" iconClass="bi-tags" />
            </div>
            <div className="col-lg-4 col-md-6">
              <SmallBoxKpi value={stats.trainingPrograms} label="Training programs" variant="warning" iconClass="bi-collection" />
            </div>
            <div className="col-lg-4 col-md-6">
              <SmallBoxKpi value={stats.pendingTrainingRequests} label="Pending requests" variant="secondary" iconClass="bi-hourglass-split" />
            </div>
            <div className="col-lg-4 col-md-6">
              <SmallBoxKpi
                value={stats.completedTrainingAssignments}
                label="Completed trainings"
                variant="success"
                iconClass="bi-check2-all"
              />
            </div>
          </div>
          <div className="alert alert-light border mb-0">
            Use the tabs to manage people, define skills and job requirements, publish training, and move requests through approval
            workflows.
          </div>
        </>
      )}

      {tab === 'people' && (
        <RoleCard title="Employee directory" iconClass="bi-person-lines-fill">
          <RoleTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Dept ID</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.name}</strong>
                  </td>
                  <td>{e.email}</td>
                  <td>{e.role}</td>
                  <td>{e.departmentId ?? '—'}</td>
                  <td>
                    {e.active ? (
                      <span className="badge text-bg-success">Active</span>
                    ) : (
                      <span className="badge text-bg-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={busy}
                      onClick={() => toggleActive(e.id, e.active)}
                    >
                      {e.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </RoleTable>
        </RoleCard>
      )}

      {tab === 'taxonomy' && (
        <div className="row g-3">
          <div className="col-lg-6">
            <RoleCard title="Add skill" iconClass="bi-plus-lg">
              <form onSubmit={createSkill} className="row g-2 align-items-end">
                <div className="col-12">
                  <label className="form-label">Skill name</label>
                  <input
                    className="form-control"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="e.g. Kubernetes"
                  />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    Create
                  </button>
                </div>
              </form>
              <p className="small text-body-secondary mt-3 mb-2">Catalog ({skills.length})</p>
              <div className="d-flex flex-wrap gap-1">
                {skills.map((s) => (
                  <span key={s.id} className="badge text-bg-light text-dark border">
                    {s.name}
                  </span>
                ))}
              </div>
            </RoleCard>
          </div>
          <div className="col-lg-6">
            <RoleCard title="Job roles & required skills" iconClass="bi-link-45deg">
              <form onSubmit={createJobRole} className="row g-2 mb-3">
                <div className="col">
                  <input
                    className="form-control"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="New job role name"
                  />
                </div>
                <div className="col-auto">
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    Add role
                  </button>
                </div>
              </form>
              <form onSubmit={addRequired} className="row g-2 align-items-end">
                <div className="col-md-4">
                  <label className="form-label">Job role</label>
                  <select className="form-select" value={reqRoleId} onChange={(e) => setReqRoleId(e.target.value)}>
                    {jobRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Skill</label>
                  <select className="form-select" value={reqSkillId} onChange={(e) => setReqSkillId(e.target.value)}>
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Required level</label>
                  <select className="form-select" value={reqLevel} onChange={(e) => setReqLevel(e.target.value)}>
                    {LEVELS.map((lv) => (
                      <option key={lv} value={lv}>
                        {lv}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-1">
                  <button className="btn btn-primary w-100" type="submit" disabled={busy}>
                    Link
                  </button>
                </div>
              </form>
            </RoleCard>
          </div>
        </div>
      )}

      {tab === 'training' && (
        <div className="row g-3">
          <div className="col-lg-6">
            <RoleCard title="Create program" iconClass="bi-journal-plus">
              <form onSubmit={createTraining}>
                <div className="mb-2">
                  <label className="form-label">Title</label>
                  <input className="form-control" value={tpTitle} onChange={(e) => setTpTitle(e.target.value)} required />
                </div>
                <div className="mb-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={tpDesc} onChange={(e) => setTpDesc(e.target.value)} rows={2} />
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Target skill</label>
                    <select className="form-select" value={tpSkillId} onChange={(e) => setTpSkillId(e.target.value)}>
                      {skills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Target level</label>
                    <select className="form-select" value={tpLevel} onChange={(e) => setTpLevel(e.target.value)}>
                      {LEVELS.map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary mt-3" type="submit" disabled={busy}>
                  Create program
                </button>
              </form>
            </RoleCard>
          </div>
          <div className="col-lg-6">
            <RoleCard title="Catalog" iconClass="bi-list-ul">
              <RoleTable>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Skill</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingPrograms.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title}</strong>
                        <div className="small text-body-secondary">{p.description}</div>
                      </td>
                      <td>{p.skillId}</td>
                      <td>{p.targetLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </RoleTable>
            </RoleCard>
          </div>
        </div>
      )}

      {tab === 'workflows' && (
        <div className="row g-3" id="workflows" style={{ scrollMarginTop: '5rem' }}>
          <div className="col-lg-5">
            <RoleCard title="Assign training" iconClass="bi-send">
              <form onSubmit={assignTraining} className="row g-2">
                <div className="col-12">
                  <label className="form-label">Employee</label>
                  <select className="form-select" value={asEmp} onChange={(e) => setAsEmp(e.target.value)}>
                    {employees.filter((u) => u.role === 'EMPLOYEE').length === 0 ? (
                      <option value="">No employees yet</option>
                    ) : (
                      employees
                        .filter((u) => u.role === 'EMPLOYEE')
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))
                    )}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Program</label>
                  <select className="form-select" value={asProg} onChange={(e) => setAsProg(e.target.value)}>
                    {trainingPrograms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    Assign
                  </button>
                </div>
              </form>
            </RoleCard>
          </div>
          <div className="col-lg-7">
            <RoleCard title="Approval queue" iconClass="bi-inbox">
              <RoleTable>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Program</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.employeeName}</td>
                      <td>{a.programTitle}</td>
                      <td>{a.status}</td>
                      <td>
                        {a.status === 'REQUESTED' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary me-1"
                              disabled={busy}
                              onClick={() => approveAsg(a.id)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              disabled={busy}
                              onClick={() => rejectAsg(a.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </RoleTable>
            </RoleCard>
          </div>
        </div>
      )}
    </>
  )
}

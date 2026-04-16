import React, { useEffect, useState } from 'react'

export default function ProjectGovernancePanel({
  busy,
  loading,
  projects,
  jobRoles,
  onRefresh,
  onCreateProject,
  onSaveProjectDeadline,
  labelClassName = 'form-label',
  inputClassName = 'form-control',
  selectClassName = 'form-select',
  buttonClassName = 'btn btn-primary',
  secondaryButtonClassName = 'btn btn-outline-secondary'
}) {
  const [projectName, setProjectName] = useState('')
  const [projectRoleId, setProjectRoleId] = useState('')
  const [projectDeadline, setProjectDeadline] = useState('')
  const [projectDeadlineDrafts, setProjectDeadlineDrafts] = useState({})

  useEffect(() => {
    const next = {}
    for (const p of projects || []) {
      next[String(p.id)] = p.deadlineAt ? String(p.deadlineAt).slice(0, 10) : ''
    }
    setProjectDeadlineDrafts(next)
    if (!projectRoleId && (jobRoles || []).length > 0) {
      setProjectRoleId(String(jobRoles[0].id))
    }
  }, [projects, jobRoles, projectRoleId])

  async function createProject() {
    const name = projectName.trim()
    if (!name) return
    await onCreateProject?.({
      name,
      requiredJobRoleId: projectRoleId ? Number(projectRoleId) : null,
      deadlineDate: projectDeadline || null
    })
    setProjectName('')
    setProjectDeadline('')
  }

  async function saveProjectDeadline(projectId) {
    const deadlineDate = projectDeadlineDrafts[String(projectId)] || null
    await onSaveProjectDeadline?.(projectId, deadlineDate)
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h3 className="h6 mb-0">Project deadlines (central management)</h3>
        <button
          type="button"
          className="btn btn-outline-dark btn-sm"
          disabled={busy || loading}
          onClick={() => onRefresh?.()}
        >
          <i className="bi bi-arrow-clockwise me-1" />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-4">
          <label className={labelClassName}>Project name</label>
          <input
            className={inputClassName}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Core Platform Revamp"
          />
        </div>
        <div className="col-md-4">
          <label className={labelClassName}>Required role</label>
          <select className={selectClassName} value={projectRoleId} onChange={(e) => setProjectRoleId(e.target.value)}>
            <option value="">None</option>
            {(jobRoles || []).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <label className={labelClassName}>Deadline</label>
          <input
            type="date"
            className={inputClassName}
            value={projectDeadline}
            onChange={(e) => setProjectDeadline(e.target.value)}
          />
        </div>
        <div className="col-md-1">
          <button type="button" className={`${buttonClassName} w-100`} disabled={busy} onClick={createProject}>
            Add
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Required role</th>
              <th>Deadline</th>
              <th>Days left</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(projects || []).map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.requiredJobRoleName || '—'}</td>
                <td style={{ maxWidth: 180 }}>
                  <input
                    type="date"
                    className={`${inputClassName} form-control-sm`}
                    value={projectDeadlineDrafts[String(p.id)] || ''}
                    onChange={(e) => setProjectDeadlineDrafts((prev) => ({ ...prev, [String(p.id)]: e.target.value }))}
                  />
                </td>
                <td>{p.daysToDeadline ?? '-'}</td>
                <td>
                  <button
                    type="button"
                    className={`${secondaryButtonClassName} btn-sm`}
                    disabled={busy}
                    onClick={() => saveProjectDeadline(p.id)}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
            {(projects || []).length === 0 && (
              <tr>
                <td colSpan={5} className="small text-body-secondary">No projects yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

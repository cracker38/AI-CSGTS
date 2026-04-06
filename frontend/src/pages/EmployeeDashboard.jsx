import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { RoleAlerts, RoleCard, RoleLoading, RoleTable, SmallBoxKpi } from './dashboard/dashboardRoleUi.jsx'

const COLOR = {
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  ORANGE: '#f97316',
  RED: '#ef4444'
}

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']

export default function EmployeeDashboard() {
  const [data, setData] = useState(null)
  const [availableSkills, setAvailableSkills] = useState([])
  const [error, setError] = useState('')
  const [skillId, setSkillId] = useState('')
  const [level, setLevel] = useState('INTERMEDIATE')
  const [saving, setSaving] = useState(false)

  function reload() {
    setError('')
    return api
      .get('/api/employee/dashboard')
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.response?.data?.error || 'FAILED_TO_LOAD_DASHBOARD'))
  }

  useEffect(() => {
    reload()
    api
      .get('/api/employee/available-skills')
      .then((res) => setAvailableSkills(res.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!data) return
    const id = (window.location.hash || '').replace(/^#/, '')
    if (!id) return
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)
    return () => clearTimeout(t)
  }, [data])

  const gaps = data?.skillGapAnalysis?.gaps || []
  const recs = data?.trainingRecommendations?.items || []
  const careerSuggestions = data?.trainingRecommendations?.careerSuggestions || []
  const gapTrends = data?.trainingRecommendations?.gapTrends || {}
  const counts = data?.skillGapAnalysis?.counts || {}
  const mySkills = data?.skills || []
  const profile = data?.profile || {}
  const notifications = data?.notifications || []

  const initial = useMemo(() => (profile.name || 'U').trim().charAt(0).toUpperCase(), [profile.name])

  async function addOrUpdateSkill(e) {
    e.preventDefault()
    if (!skillId) return
    setSaving(true)
    setError('')
    try {
      await api.post('/api/employee/skills', { skillId: Number(skillId), level })
      setSkillId('')
      await reload()
    } catch (err) {
      setError(err?.response?.data?.error || 'SKILL_SAVE_FAILED')
    } finally {
      setSaving(false)
    }
  }

  async function removeSkill(skillIdToRemove) {
    setSaving(true)
    setError('')
    try {
      await api.delete(`/api/employee/skills/${skillIdToRemove}`)
      await reload()
    } catch (err) {
      setError(err?.response?.data?.error || 'SKILL_DELETE_FAILED')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <RoleAlerts error={error} />

      {!data ? (
        <RoleLoading>Loading your workspace…</RoleLoading>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-12">
              <div className="card bg-primary text-white shadow-sm">
                <div className="card-body">
                  <div className="d-flex flex-wrap align-items-center gap-3">
                    <div
                      className="rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{ width: '3.5rem', height: '3.5rem', fontSize: '1.25rem' }}
                      aria-hidden
                    >
                      {initial}
                    </div>
                    <div className="flex-grow-1">
                      <h2 className="h4 mb-1">{profile.name}</h2>
                      <p className="mb-2 opacity-90 small">
                        Employee competency workspace — skills, gaps, and learning in one view.
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        <span className="badge bg-light text-primary">Role: {profile.role}</span>
                        <span className="badge bg-light text-primary">
                          {profile.departmentName || 'Department'} · {profile.jobRoleName || 'Job role'}
                        </span>
                        <span className="badge bg-light text-primary">{profile.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-lg-3 col-6">
              <SmallBoxKpi value={counts.green ?? 0} label="On track" variant="success" iconClass="bi-check-circle" />
            </div>
            <div className="col-lg-3 col-6">
              <SmallBoxKpi value={counts.yellow ?? 0} label="Watch" variant="warning" iconClass="bi-exclamation-triangle" />
            </div>
            <div className="col-lg-3 col-6">
              <SmallBoxKpi value={counts.orange ?? 0} label="Gap" variant="warning" iconClass="bi-graph-down" />
            </div>
            <div className="col-lg-3 col-6">
              <SmallBoxKpi value={counts.red ?? 0} label="Critical" variant="danger" iconClass="bi-x-octagon" />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-xl-7">
              <RoleCard id="skill-gaps" title="Skill gap analysis" iconClass="bi-bar-chart-steps">
                <RoleTable>
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Required</th>
                      <th>Current</th>
                      <th>Gap</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.map((g) => (
                      <tr key={g.skillId}>
                        <td>
                          <strong>{g.skillName}</strong>
                        </td>
                        <td>{g.requiredLevel}</td>
                        <td>{g.currentLevel}</td>
                        <td>{g.gapRank}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: `${COLOR[g.color] || '#64748b'}22`,
                              color: COLOR[g.color] || '#64748b'
                            }}
                          >
                            {g.color}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </RoleTable>
              </RoleCard>

              <RoleCard title="My skills" iconClass="bi-plus-circle" className="mt-3">
                <form className="row g-2 align-items-end mb-3" onSubmit={addOrUpdateSkill}>
                  <div className="col-md-5">
                    <label className="form-label">Skill</label>
                    <select
                      className="form-select"
                      value={skillId}
                      onChange={(e) => setSkillId(e.target.value)}
                      required
                    >
                      <option value="">Select skill</option>
                      {availableSkills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Level</label>
                    <select className="form-select" value={level} onChange={(e) => setLevel(e.target.value)}>
                      {LEVELS.map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <button className="btn btn-primary w-100" type="submit" disabled={saving}>
                      {saving ? 'Saving…' : 'Add / update'}
                    </button>
                  </div>
                </form>
                <div className="d-flex flex-wrap gap-2">
                  {mySkills.map((s) => (
                    <span key={s.skillId} className="badge text-bg-light border text-dark p-2">
                      {s.skillName}: <strong>{s.level}</strong>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger ms-2 py-0"
                        onClick={() => removeSkill(s.skillId)}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </span>
                  ))}
                  {mySkills.length === 0 && <span className="text-body-secondary">No skills recorded yet.</span>}
                </div>
              </RoleCard>
            </div>

            <div className="col-xl-5">
              <RoleCard title="Training recommendations" iconClass="bi-lightbulb">
                {recs.length === 0 ? (
                  <p className="text-body-secondary mb-0">No programs recommended yet — keep your profile updated.</p>
                ) : (
                  recs.map((r) => (
                    <div key={r.programId} className="card bg-body-secondary mb-2">
                      <div className="card-body py-2">
                        <div className="d-flex justify-content-between gap-2">
                          <strong>{r.title}</strong>
                          {r.priority && <span className="badge text-bg-warning">Priority</span>}
                        </div>
                        <p className="small text-body-secondary mb-2">{r.description}</p>
                        <span
                          className="badge"
                          style={{
                            background: `${COLOR[r.gapColor] || '#64748b'}22`,
                            color: COLOR[r.gapColor] || '#64748b'
                          }}
                        >
                          Gap signal: {r.gapColor}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </RoleCard>

              <RoleCard title="Career path & trends" iconClass="bi-diagram-3" className="mt-3">
                <p className="small text-body-secondary mb-2">Suggested moves</p>
                {careerSuggestions.length === 0 ? (
                  <p className="text-body-secondary small">No suggestions yet.</p>
                ) : (
                  <ul className="mb-3">
                    {careerSuggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                )}
                <p className="small text-body-secondary mb-2">Gap distribution</p>
                {['GREEN', 'YELLOW', 'ORANGE', 'RED'].map((k) => {
                  const v = gapTrends[k] || 0
                  const pct = Math.min(100, v * 15)
                  return (
                    <div key={k} className="mb-2">
                      <div className="d-flex justify-content-between small">
                        <span>{k}</span>
                        <span className="text-body-secondary">{v}</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar"
                          style={{ width: `${pct}%`, backgroundColor: COLOR[k] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </RoleCard>

              <RoleCard id="training" title="Notifications" iconClass="bi-bell" className="mt-3">
                {notifications.length === 0 ? (
                  <p className="text-body-secondary mb-0">No training updates yet.</p>
                ) : (
                  notifications.map((n, idx) => (
                    <div key={idx} className="d-flex gap-2 border-bottom pb-2 mb-2">
                      <span className="badge rounded-pill bg-primary">&nbsp;</span>
                      <div>
                        <div className="fw-semibold">{n.programTitle}</div>
                        <div className="small text-body-secondary">
                          {n.type} · {n.status} · {String(n.requestedAt).slice(0, 10)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <p className="small text-body-secondary mb-0 mt-2">
                  Feedback and profile reviews will appear here as your organization enables workflows.
                </p>
              </RoleCard>
            </div>
          </div>
        </>
      )}
    </>
  )
}

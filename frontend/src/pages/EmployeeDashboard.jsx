import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import { BRAND_SUBTITLE, BRAND_TITLE } from '../content/branding.js'
import { downloadBlob, downloadTextFile, formatInstant } from './admin/adminHelpers.js'
import CsgtsModuleMap from './dashboard/CsgtsModuleMap.jsx'
import { RoleAlerts, RoleLoading } from './dashboard/dashboardRoleUi.jsx'

const COLOR = {
  GREEN: '#16a34a',
  YELLOW: '#ca8a04',
  ORANGE: '#ea580c',
  RED: '#dc2626'
}

const GAP_STATUS = {
  GREEN: { label: 'On track', short: 'OK' },
  YELLOW: { label: 'Watch', short: 'Watch' },
  ORANGE: { label: 'Gap', short: 'Gap' },
  RED: { label: 'Critical', short: 'Critical' }
}

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']

const LEVEL_LABEL = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert'
}

const TREND_LABEL = {
  GREEN: 'On track',
  YELLOW: 'Watch',
  ORANGE: 'Gap',
  RED: 'Critical'
}

const TRAINING_STATUS = {
  REQUESTED: { label: 'Requested', tone: 'info' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  COMPLETED: { label: 'Completed', tone: 'muted' }
}

function roleTitle(role) {
  if (!role) return ''
  const r = String(role)
  return r.charAt(0) + r.slice(1).toLowerCase()
}

const EMPLOYEE_SECTION_HASHES = ['skill-gaps', 'my-skills', 'cert-vault', 'insights', 'training-recs', 'training']

function parseEmployeeView(hash) {
  const h = (hash || '').replace(/^#/, '')
  if (EMPLOYEE_SECTION_HASHES.includes(h)) return h
  return 'overview'
}

/** Copy + chrome for each URL: /employee, /employee#skill-gaps, … */
const EMP_VIEW_UI = {
  overview: {
    eyebrow: 'Employee workspace',
    lead: 'Track competencies against your role, update skills, and follow training recommendations — all in one place.',
    kpiTitle: 'Live skill posture',
    kpiHint: 'Across required role skills',
    icon: 'bi-stars'
  },
  'skill-gaps': {
    eyebrow: 'Skill gap intelligence',
    lead: 'Compare required vs. declared proficiency — ranked so you know exactly where to focus development first.',
    kpiTitle: 'Gap severity snapshot',
    kpiHint: 'Aligned with the analysis below',
    icon: 'bi-bar-chart-steps'
  },
  'my-skills': {
    eyebrow: 'Proficiency ledger',
    lead: 'Declare and maintain your skills — every update refreshes gap analysis and training signals.',
    kpiTitle: 'Profile context',
    kpiHint: 'How your declarations sit vs. role requirements',
    icon: 'bi-patch-check-fill'
  },
  'cert-vault': {
    eyebrow: 'Credential vault',
    lead: 'Store certificates and credentials with optional expiry — files stay private to your account.',
    kpiTitle: 'Evidence on file',
    kpiHint: 'Uploads support compliance and HR verification',
    icon: 'bi-shield-lock-fill'
  },
  insights: {
    eyebrow: 'Signals & feedback',
    lead: 'Heuristic readiness hints plus recent manager skill assessments tied to your profile.',
    kpiTitle: 'Human + system view',
    kpiHint: 'Not a substitute for formal performance reviews',
    icon: 'bi-graph-up-arrow'
  },
  'training-recs': {
    eyebrow: 'Learning paths',
    lead: 'Programs prioritized from your largest gaps — pick up what moves the needle fastest.',
    kpiTitle: 'Readiness signals',
    kpiHint: 'What training is trying to address',
    icon: 'bi-lightbulb-fill'
  },
  training: {
    eyebrow: 'Request activity',
    lead: 'Track program requests and approvals — updates as HR and managers process your training.',
    kpiTitle: 'Pipeline status',
    kpiHint: 'Counts reflect assignments below',
    icon: 'bi-inbox-fill'
  }
}

export default function EmployeeDashboard() {
  const { hash } = useLocation()
  const [data, setData] = useState(null)
  const [availableSkills, setAvailableSkills] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [skillId, setSkillId] = useState('')
  const [level, setLevel] = useState('INTERMEDIATE')
  const [saving, setSaving] = useState(false)
  const [gapSearch, setGapSearch] = useState('')
  const [gapCategoryFilter, setGapCategoryFilter] = useState('')
  const [trainingFormatFilter, setTrainingFormatFilter] = useState('')
  const [certTitle, setCertTitle] = useState('')
  const [certIssuer, setCertIssuer] = useState('')
  const [certExpires, setCertExpires] = useState('')
  const [certFile, setCertFile] = useState(null)

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

  const empView = useMemo(() => parseEmployeeView(hash), [hash])
  const viewUi = EMP_VIEW_UI[empView] || EMP_VIEW_UI.overview
  const sectionMode = empView !== 'overview'

  useEffect(() => {
    if (!data) return
    const raw = (hash || '').replace(/^#/, '')
    const scrollId = EMPLOYEE_SECTION_HASHES.includes(raw) ? raw : 'overview'
    const delay = raw && EMPLOYEE_SECTION_HASHES.includes(raw) ? 320 : 60
    const t = window.setTimeout(() => {
      document.getElementById(scrollId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, delay)
    return () => clearTimeout(t)
  }, [data, hash])

  function panelViewClass(sectionId) {
    if (!sectionMode) return ''
    return sectionId === empView ? ' emp-panel--view-focus' : ' emp-panel--view-context'
  }

  const gaps = data?.skillGapAnalysis?.gaps || []
  const recs = data?.trainingRecommendations?.items || []
  const careerSuggestions = data?.trainingRecommendations?.careerSuggestions || []
  const gapTrends = data?.trainingRecommendations?.gapTrends || {}
  const counts = data?.skillGapAnalysis?.counts || {}
  const mySkills = data?.skills || []
  const profile = data?.profile || {}
  const notifications = data?.notifications || []
  const profileCompleteness = typeof data?.profileCompleteness === 'number' ? data.profileCompleteness : null
  const certifications = data?.certifications || []
  const managerAssessments = data?.managerAssessments || []
  const aiInsights = data?.aiInsights || null

  const gapCategories = useMemo(() => {
    const set = new Set()
    for (const g of gaps) {
      const c = (g.skillCategory || '').trim()
      if (c) set.add(c)
    }
    return [...set].sort()
  }, [gaps])

  const gapsFiltered = useMemo(() => {
    const q = gapSearch.trim().toLowerCase()
    let list = gaps
    if (gapCategoryFilter) {
      list = list.filter((g) => (g.skillCategory || '').trim() === gapCategoryFilter)
    }
    if (!q) return list
    return list.filter(
      (g) =>
        (g.skillName && g.skillName.toLowerCase().includes(q)) ||
        String(g.gapRank).includes(q) ||
        (g.skillCategory && g.skillCategory.toLowerCase().includes(q))
    )
  }, [gaps, gapSearch, gapCategoryFilter])

  const recsFiltered = useMemo(() => {
    if (!trainingFormatFilter) return recs
    return recs.filter((r) => String(r.deliveryFormat || '') === trainingFormatFilter)
  }, [recs, trainingFormatFilter])

  const initial = useMemo(() => (profile.name || 'U').trim().charAt(0).toUpperCase(), [profile.name])

  async function addOrUpdateSkill(e) {
    e.preventDefault()
    if (!skillId) return
    setSaving(true)
    setError('')
    setMsg('')
    try {
      await api.post('/api/employee/skills', { skillId: Number(skillId), level })
      setSkillId('')
      setMsg('Skill saved — your profile and gap analysis are updated.')
      await reload()
    } catch (err) {
      setError(err?.response?.data?.error || 'SKILL_SAVE_FAILED')
    } finally {
      setSaving(false)
    }
  }

  function exportGapsCsv() {
    const header = 'skillName,skillCategory,requiredLevel,currentLevel,gapRank,color'
    const lines = (gaps || []).map((g) =>
      [g.skillName, g.skillCategory, g.requiredLevel, g.currentLevel, g.gapRank, g.color]
        .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    downloadTextFile(`skill-gaps-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines].join('\n'))
  }

  function printGapReport() {
    window.print()
  }

  async function uploadCertification(e) {
    e.preventDefault()
    if (!certTitle.trim() || !certFile) {
      setError('Title and file are required.')
      return
    }
    setSaving(true)
    setError('')
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('title', certTitle.trim())
      if (certIssuer.trim()) fd.append('issuer', certIssuer.trim())
      if (certExpires.trim()) fd.append('expiresAt', `${certExpires.trim()}T00:00:00Z`)
      fd.append('file', certFile)
      await api.post('/api/employee/certifications', fd)
      setCertTitle('')
      setCertIssuer('')
      setCertExpires('')
      setCertFile(null)
      setMsg('Certification uploaded.')
      await reload()
    } catch (err) {
      setError(err?.response?.data?.error || 'UPLOAD_FAILED')
    } finally {
      setSaving(false)
    }
  }

  async function downloadCertFile(id) {
    try {
      const res = await api.get(`/api/employee/certifications/${id}/file`, { responseType: 'blob' })
      const c = certifications.find((x) => x.id === id)
      downloadBlob(c?.fileName || 'certificate', res.data)
    } catch {
      setError('DOWNLOAD_FAILED')
    }
  }

  async function deleteCert(id) {
    if (!window.confirm('Delete this certification record and file?')) return
    setSaving(true)
    try {
      await api.delete(`/api/employee/certifications/${id}`)
      setMsg('Certification removed.')
      await reload()
    } catch (err) {
      setError(err?.response?.data?.error || 'DELETE_FAILED')
    } finally {
      setSaving(false)
    }
  }

  async function removeSkill(skillIdToRemove) {
    setSaving(true)
    setError('')
    setMsg('')
    try {
      await api.delete(`/api/employee/skills/${skillIdToRemove}`)
      setMsg('Skill removed from your profile.')
      await reload()
    } catch (err) {
      setError(err?.response?.data?.error || 'SKILL_DELETE_FAILED')
    } finally {
      setSaving(false)
    }
  }

  const nav = [
    { id: 'skill-gaps', label: 'Skill gaps', icon: 'bi-bar-chart-steps' },
    { id: 'my-skills', label: 'My skills', icon: 'bi-stars' },
    { id: 'cert-vault', label: 'Vault', icon: 'bi-folder2-open' },
    { id: 'insights', label: 'Insights', icon: 'bi-activity' },
    { id: 'training-recs', label: 'Training', icon: 'bi-lightbulb' },
    { id: 'training', label: 'Activity', icon: 'bi-bell' }
  ]

  return (
    <>
      <RoleAlerts error={error} success={msg} />

      {!data ? (
        <RoleLoading>Loading your workspace…</RoleLoading>
      ) : (
        <div className={`emp-dash emp-dash--view-${empView}`}>
          <section
            className={`emp-dash-hero emp-dash-hero--view-${empView}`}
            id="overview"
            aria-labelledby="emp-dash-title"
          >
            <div className="emp-dash-hero__glow" aria-hidden />
            <div className={`emp-dash-hero__accent emp-dash-hero__accent--${empView}`} aria-hidden />
            <div className="emp-dash-hero__inner">
              <header className="emp-dash-hero__brand" aria-label="Product">
                <span className="emp-dash-hero__brand-mark">AI</span>
                <div className="emp-dash-hero__brand-text">
                  <span className="emp-dash-hero__brand-name">{BRAND_TITLE}</span>
                  <span className="emp-dash-hero__brand-tag">{BRAND_SUBTITLE}</span>
                </div>
              </header>
              <div className="emp-dash-hero__grid">
                <div className="emp-dash-hero__identity">
                  <div className={`emp-dash-avatar emp-dash-avatar--view-${empView}`} aria-hidden>
                    {initial}
                  </div>
                  <div className="emp-dash-hero__text">
                    <p className="emp-dash-eyebrow">
                      <i className={`bi ${viewUi.icon} emp-dash-eyebrow__ico`} aria-hidden />
                      {viewUi.eyebrow}
                    </p>
                    <h1 id="emp-dash-title" className="emp-dash-title">
                      {profile.name || 'Welcome'}
                    </h1>
                    <p className="emp-dash-lead">{viewUi.lead}</p>
                    <div className="emp-dash-meta">
                      <span className="emp-dash-chip">
                        <i className="bi bi-person-badge" />
                        {roleTitle(profile.role)}
                      </span>
                      <span className="emp-dash-chip">
                        <i className="bi bi-building" />
                        {profile.departmentName || 'No department'}
                      </span>
                      <span className="emp-dash-chip">
                        <i className="bi bi-briefcase" />
                        {profile.jobRoleName || 'No job role'}
                      </span>
                      <span className="emp-dash-chip emp-dash-chip--email">
                        <i className="bi bi-envelope" />
                        {profile.email || '—'}
                      </span>
                      {profileCompleteness != null ? (
                        <span className="emp-dash-chip" title="Profile completeness (dept, job role, gap health)">
                          <i className="bi bi-pie-chart-fill" />
                          {profileCompleteness}% profile
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="emp-dash-hero__actions">
                  <nav className="emp-dash-quick" aria-label="Section shortcuts">
                    {nav.map((n) => (
                      <a
                        key={n.id}
                        className={`emp-dash-quick__link${empView === n.id ? ' emp-dash-quick__link--active' : ''}`}
                        href={`#${n.id}`}
                        aria-current={empView === n.id ? 'true' : undefined}
                      >
                        <i className={`bi ${n.icon}`} aria-hidden />
                        {n.label}
                      </a>
                    ))}
                  </nav>
                  <button type="button" className="emp-dash-sync" onClick={() => reload()} disabled={saving}>
                    <i className="bi bi-arrow-clockwise" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className={`emp-dash-kpis-head emp-dash-kpis-head--view-${empView}`}>
            <span className="emp-dash-kpis-head__title">{viewUi.kpiTitle}</span>
            <span className="emp-dash-kpis-head__hint">{viewUi.kpiHint}</span>
          </div>
          <div className={`emp-dash-kpis emp-dash-kpis--view-${empView}`}>
            <div className="emp-dash-kpi emp-dash-kpi--g">
              <div className="emp-dash-kpi__icon">
                <i className="bi bi-check-circle-fill" />
              </div>
              <div>
                <span className="emp-dash-kpi__val">{counts.green ?? 0}</span>
                <span className="emp-dash-kpi__lab">{GAP_STATUS.GREEN.label}</span>
              </div>
            </div>
            <div className="emp-dash-kpi emp-dash-kpi--y">
              <div className="emp-dash-kpi__icon">
                <i className="bi bi-exclamation-triangle-fill" />
              </div>
              <div>
                <span className="emp-dash-kpi__val">{counts.yellow ?? 0}</span>
                <span className="emp-dash-kpi__lab">{GAP_STATUS.YELLOW.label}</span>
              </div>
            </div>
            <div className="emp-dash-kpi emp-dash-kpi--o">
              <div className="emp-dash-kpi__icon">
                <i className="bi bi-graph-down-arrow" />
              </div>
              <div>
                <span className="emp-dash-kpi__val">{counts.orange ?? 0}</span>
                <span className="emp-dash-kpi__lab">{GAP_STATUS.ORANGE.label}</span>
              </div>
            </div>
            <div className="emp-dash-kpi emp-dash-kpi--r">
              <div className="emp-dash-kpi__icon">
                <i className="bi bi-x-octagon-fill" />
              </div>
              <div>
                <span className="emp-dash-kpi__val">{counts.red ?? 0}</span>
                <span className="emp-dash-kpi__lab">{GAP_STATUS.RED.label}</span>
              </div>
            </div>
          </div>

          <div className={`emp-dash-grid emp-dash-grid--view-${empView}`}>
            <div className="emp-dash-main">
              <section
                className={`emp-panel emp-panel--accent-cyan emp-print-gaps${panelViewClass('skill-gaps')}`}
                id="skill-gaps"
              >
                <header className="emp-panel__head">
                  <span className="emp-panel__icon">
                    <i className="bi bi-bar-chart-steps" />
                  </span>
                  <div>
                    <h2 className="emp-panel__title">Skill gap analysis</h2>
                    <p className="emp-panel__sub">Required vs. current level by skill — ranked for development focus.</p>
                  </div>
                </header>
                <div className="emp-panel__toolbar emp-panel__toolbar--wrap">
                  <div className="emp-search">
                    <i className="bi bi-search emp-search__icon" aria-hidden />
                    <input
                      type="search"
                      className="emp-search__input"
                      placeholder="Filter skills…"
                      value={gapSearch}
                      onChange={(e) => setGapSearch(e.target.value)}
                      aria-label="Filter skill gaps"
                    />
                  </div>
                  {gapCategories.length > 0 ? (
                    <select
                      className="form-select form-select-sm emp-gap-cat-select"
                      style={{ maxWidth: 200 }}
                      value={gapCategoryFilter}
                      onChange={(e) => setGapCategoryFilter(e.target.value)}
                      aria-label="Filter by skill category"
                    >
                      <option value="">All categories</option>
                      {gapCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <div className="d-flex flex-wrap gap-2 ms-auto">
                    <button
                      type="button"
                      className="emp-dash-sync"
                      onClick={printGapReport}
                      disabled={!gaps.length}
                      title="Use your browser print dialog to save as PDF"
                    >
                      <i className="bi bi-printer" aria-hidden />
                      Print / PDF
                    </button>
                    <button
                      type="button"
                      className="emp-dash-sync"
                      onClick={exportGapsCsv}
                      disabled={!gaps.length}
                      title="Download gap analysis as CSV"
                    >
                      <i className="bi bi-download" aria-hidden />
                      Export CSV
                    </button>
                  </div>
                </div>
                {gapsFiltered.length === 0 ? (
                  <div className="emp-empty">
                    <i className="bi bi-clipboard-data emp-empty__icon" aria-hidden />
                    <p className="emp-empty__title">{gaps.length === 0 ? 'No gap data yet' : 'No matching skills'}</p>
                    <p className="emp-empty__text">
                      {gaps.length === 0
                        ? 'Add skills below or ask HR to align your job role with required skills.'
                        : 'Try another search term.'}
                    </p>
                  </div>
                ) : (
                  <div className="emp-table-wrap">
                    <table className="emp-table">
                      <thead>
                        <tr>
                          <th>Skill</th>
                          <th>Category</th>
                          <th>Required</th>
                          <th>Current</th>
                          <th>Gap rank</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gapsFiltered.map((g) => {
                          const c = String(g.color || '').toUpperCase()
                          const st = GAP_STATUS[c] || { label: g.color, short: g.color }
                          const rowTone = (c && GAP_STATUS[c] ? c : 'muted').toLowerCase()
                          return (
                            <tr key={g.skillId} className={`emp-tr emp-tr--${rowTone}`}>
                              <td>
                                <strong className="emp-skill-name">{g.skillName}</strong>
                              </td>
                              <td className="small text-body-secondary">{g.skillCategory || '—'}</td>
                              <td>{LEVEL_LABEL[g.requiredLevel] || g.requiredLevel}</td>
                              <td>{LEVEL_LABEL[g.currentLevel] || g.currentLevel}</td>
                              <td>
                                <span className="emp-gap-rank">{g.gapRank}</span>
                              </td>
                              <td>
                                <span
                                  className="emp-status-pill"
                                  style={{
                                    borderColor: `${COLOR[c] || '#64748b'}55`,
                                    color: COLOR[c] || '#64748b',
                                    background: `${COLOR[c] || '#64748b'}14`
                                  }}
                                >
                                  {st.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section
                className={`emp-panel emp-panel--accent-violet${panelViewClass('my-skills')}`}
                id="my-skills"
              >
                <header className="emp-panel__head">
                  <span className="emp-panel__icon emp-panel__icon--accent">
                    <i className="bi bi-stars" />
                  </span>
                  <div>
                    <h2 className="emp-panel__title">My skills</h2>
                    <p className="emp-panel__sub">Declare proficiency — updates feed gap analysis and recommendations.</p>
                  </div>
                </header>
                <form className="emp-skill-form" onSubmit={addOrUpdateSkill}>
                  <div className="emp-skill-form__row">
                    <label className="emp-field">
                      <span className="emp-field__lab">Skill</span>
                      <select
                        className="emp-field__ctrl"
                        value={skillId}
                        onChange={(e) => setSkillId(e.target.value)}
                        required
                      >
                        <option value="">Select a skill…</option>
                      {availableSkills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.category ? ` · ${s.category}` : ''}
                        </option>
                      ))}
                      </select>
                    </label>
                    <label className="emp-field">
                      <span className="emp-field__lab">Proficiency</span>
                      <select className="emp-field__ctrl" value={level} onChange={(e) => setLevel(e.target.value)}>
                        {LEVELS.map((lv) => (
                          <option key={lv} value={lv}>
                            {LEVEL_LABEL[lv] || lv}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="emp-btn-primary" type="submit" disabled={saving}>
                      {saving ? 'Saving…' : 'Add / update'}
                    </button>
                  </div>
                </form>
                <div className="emp-skill-chips" aria-label="Your declared skills">
                  {mySkills.length === 0 ? (
                    <p className="emp-muted">No skills recorded yet — add at least one to personalize recommendations.</p>
                  ) : (
                    mySkills.map((s) => (
                      <div key={s.skillId} className="emp-chip">
                        <span className="emp-chip__name">
                          {s.skillName}
                          {s.category ? <span className="emp-chip__cat"> · {s.category}</span> : null}
                        </span>
                        <span className="emp-chip__lvl">{LEVEL_LABEL[s.level] || s.level}</span>
                        <button
                          type="button"
                          className="emp-chip__rm"
                          onClick={() => removeSkill(s.skillId)}
                          disabled={saving}
                          aria-label={`Remove ${s.skillName}`}
                        >
                          <i className="bi bi-x-lg" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section
                className={`emp-panel emp-panel--accent-teal${panelViewClass('cert-vault')}`}
                id="cert-vault"
              >
                <header className="emp-panel__head">
                  <span className="emp-panel__icon emp-panel__icon--teal">
                    <i className="bi bi-folder2-open" />
                  </span>
                  <div>
                    <h2 className="emp-panel__title">Certification vault</h2>
                    <p className="emp-panel__sub">Upload PDF or image evidence; download or remove records anytime.</p>
                  </div>
                </header>
                <form className="emp-skill-form mb-3" onSubmit={uploadCertification}>
                  <div className="emp-skill-form__row flex-wrap">
                    <label className="emp-field">
                      <span className="emp-field__lab">Title</span>
                      <input
                        className="emp-field__ctrl"
                        value={certTitle}
                        onChange={(e) => setCertTitle(e.target.value)}
                        placeholder="e.g. AWS Solutions Architect"
                        required
                      />
                    </label>
                    <label className="emp-field">
                      <span className="emp-field__lab">Issuer</span>
                      <input
                        className="emp-field__ctrl"
                        value={certIssuer}
                        onChange={(e) => setCertIssuer(e.target.value)}
                        placeholder="Optional"
                      />
                    </label>
                    <label className="emp-field">
                      <span className="emp-field__lab">Expires</span>
                      <input
                        type="date"
                        className="emp-field__ctrl"
                        value={certExpires}
                        onChange={(e) => setCertExpires(e.target.value)}
                      />
                    </label>
                    <label className="emp-field">
                      <span className="emp-field__lab">File</span>
                      <input
                        type="file"
                        className="emp-field__ctrl"
                        onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                      />
                    </label>
                    <button className="emp-btn-primary align-self-end" type="submit" disabled={saving}>
                      {saving ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                  <p className="emp-muted small mb-0">Max 4 MB per file. Server stores files under the configured upload directory.</p>
                </form>
                {certifications.length === 0 ? (
                  <p className="emp-muted">No certifications on file yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Issuer</th>
                          <th>Expires</th>
                          <th>File</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certifications.map((c) => (
                          <tr key={c.id}>
                            <td className="fw-medium">{c.title}</td>
                            <td>{c.issuer || '—'}</td>
                            <td className="small">{c.expiresAt ? formatInstant(c.expiresAt) : '—'}</td>
                            <td className="small text-truncate" style={{ maxWidth: 140 }} title={c.fileName}>
                              {c.fileName}
                            </td>
                            <td className="text-end text-nowrap">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary me-1"
                                onClick={() => downloadCertFile(c.id)}
                              >
                                Download
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteCert(c.id)}
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section
                className={`emp-panel emp-panel--accent-rose${panelViewClass('insights')}`}
                id="insights"
              >
                <header className="emp-panel__head">
                  <span className="emp-panel__icon emp-panel__icon--rose">
                    <i className="bi bi-activity" />
                  </span>
                  <div>
                    <h2 className="emp-panel__title">AI insights &amp; manager assessments</h2>
                    <p className="emp-panel__sub">
                      Heuristics always apply; with a server-side API key, an optional LLM adds coaching copy (falls back automatically if the model is unavailable).
                    </p>
                  </div>
                </header>
                {aiInsights ? (
                  <div className="rounded-3 border bg-body-tertiary p-3 mb-3 small">
                    <p className="mb-1">
                      <strong>Model:</strong> {aiInsights.model}{' '}
                      <span className="text-body-secondary">
                        · confidence ~{aiInsights.confidencePct}%
                        {aiInsights.source ? ` · ${aiInsights.source}` : ''}
                      </span>
                    </p>
                    <p className="mb-1">
                      <strong>Decay risk:</strong> {aiInsights.decayRisk}
                    </p>
                    <p className="mb-2 text-body-secondary">{aiInsights.forecastNote}</p>
                    {(aiInsights.priorityFocus || []).length > 0 ? (
                      <p className="mb-1">
                        <strong>Focus:</strong> {(aiInsights.priorityFocus || []).join(' · ')}
                      </p>
                    ) : null}
                    {aiInsights.nextStep ? (
                      <p className="mb-1">
                        <strong>Next step:</strong> {aiInsights.nextStep}
                      </p>
                    ) : null}
                    {aiInsights.marketNote ? (
                      <p className="mb-0 text-body-secondary">
                        <strong>Market / data:</strong> {aiInsights.marketNote}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {managerAssessments.length === 0 ? (
                  <p className="emp-muted mb-0">No manager skill assessments recorded yet.</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {managerAssessments.map((a) => (
                      <li key={a.id} className="list-group-item px-0 bg-transparent">
                        <div className="d-flex flex-wrap justify-content-between gap-2">
                          <span className="fw-semibold">{a.skillName}</span>
                          <span className="small text-body-secondary">{formatInstant(a.createdAt)}</span>
                        </div>
                        <div className="small">
                          <span className="text-body-secondary">By {a.managerName}</span>
                          {' · '}
                          <span className="fw-medium">{LEVEL_LABEL[a.assessedLevel] || a.assessedLevel}</span>
                        </div>
                        {a.note ? <p className="small mb-0 mt-1 text-body-secondary">{a.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <aside className={`emp-dash-aside emp-dash-aside--view-${empView}`}>
              <section
                className={`emp-panel emp-panel--compact emp-panel--accent-amber${panelViewClass('training-recs')}`}
                id="training-recs"
              >
                <header className="emp-panel__head">
                  <span className="emp-panel__icon emp-panel__icon--amber">
                    <i className="bi bi-lightbulb-fill" />
                  </span>
                  <div className="flex-grow-1">
                    <h2 className="emp-panel__title">Training recommendations</h2>
                    <p className="emp-panel__sub">Programs aligned to your largest skill gaps.</p>
                  </div>
                </header>
                {recs.length > 0 ? (
                  <div className="mb-3">
                    <label className="form-label small text-body-secondary mb-1">Delivery format</label>
                    <select
                      className="form-select form-select-sm"
                      value={trainingFormatFilter}
                      onChange={(e) => setTrainingFormatFilter(e.target.value)}
                      aria-label="Filter recommendations by delivery format"
                    >
                      <option value="">All formats</option>
                      <option value="ONLINE">Online</option>
                      <option value="IN_PERSON">In person</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="CERTIFICATION">Certification</option>
                    </select>
                  </div>
                ) : null}
                {recs.length === 0 ? (
                  <p className="emp-muted emp-muted--pad">No programs recommended yet — keep your skills up to date.</p>
                ) : recsFiltered.length === 0 ? (
                  <p className="emp-muted emp-muted--pad">No programs match this format — clear the filter to see all.</p>
                ) : (
                  <ul className="emp-rec-list">
                    {recsFiltered.map((r) => {
                      const gc = String(r.gapColor || '').toUpperCase()
                      return (
                        <li key={`${r.programId}-${r.skillId}`} className="emp-rec-card">
                          <div className="emp-rec-card__top">
                            <strong className="emp-rec-card__title">{r.title}</strong>
                            {r.priority ? <span className="emp-pill-warn">Priority</span> : null}
                          </div>
                          {r.description ? <p className="emp-rec-card__desc">{r.description}</p> : null}
                          <div className="d-flex flex-wrap gap-1 mb-2">
                            {r.provider ? (
                              <span className="badge rounded-pill text-bg-light text-dark border">{r.provider}</span>
                            ) : null}
                            {r.deliveryFormat ? (
                              <span className="badge rounded-pill text-bg-secondary">{r.deliveryFormat.replace(/_/g, ' ')}</span>
                            ) : null}
                          </div>
                          <span
                            className="emp-rec-signal"
                            style={{
                              color: COLOR[gc] || '#64748b',
                              borderColor: `${COLOR[gc] || '#64748b'}40`,
                              background: `${COLOR[gc] || '#64748b'}12`
                            }}
                          >
                            Signal: {GAP_STATUS[gc]?.label || r.gapColor}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section
                className={`emp-panel emp-panel--compact emp-panel--accent-teal${sectionMode ? ' emp-panel--view-context' : ''}`}
              >
                <header className="emp-panel__head">
                  <span className="emp-panel__icon emp-panel__icon--teal">
                    <i className="bi bi-diagram-3" />
                  </span>
                  <div>
                    <h2 className="emp-panel__title">Career &amp; trends</h2>
                    <p className="emp-panel__sub">Suggestions and gap distribution.</p>
                  </div>
                </header>
                {careerSuggestions.length > 0 && (
                  <ul className="emp-career-list">
                    {careerSuggestions.map((s, idx) => (
                      <li key={idx}>
                        <i className="bi bi-arrow-right-circle emp-career-list__ico" aria-hidden />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                {careerSuggestions.length === 0 && <p className="emp-muted emp-muted--pad">No career suggestions yet.</p>}
                <div className="emp-profile-roadmap">
                  <p className="emp-trend-head">Extended profile (roadmap)</p>
                  <p className="emp-muted small mb-2">
                    Competency module extras planned: certification vault, project experience timeline, peer/manager endorsements, and
                    automated profile reminders — use <strong>My skills</strong> and <strong>Skill gap analysis</strong> for the live MVP.
                  </p>
                </div>
                <p className="emp-trend-head">Gap distribution</p>
                <div className="emp-trends">
                  {['GREEN', 'YELLOW', 'ORANGE', 'RED'].map((k) => {
                    const v = gapTrends[k] || 0
                    const pct = Math.min(100, v * 15)
                    return (
                      <div key={k} className="emp-trend-row">
                        <div className="emp-trend-label">
                          <span>{TREND_LABEL[k] || k}</span>
                          <span className="emp-trend-n">{v}</span>
                        </div>
                        <div className="emp-trend-bar">
                          <div className="emp-trend-fill" style={{ width: `${pct}%`, background: COLOR[k] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section
                className={`emp-panel emp-panel--compact emp-panel--accent-rose${panelViewClass('training')}`}
                id="training"
              >
                <header className="emp-panel__head">
                  <span className="emp-panel__icon emp-panel__icon--rose">
                    <i className="bi bi-bell-fill" />
                  </span>
                  <div>
                    <h2 className="emp-panel__title">Training activity</h2>
                    <p className="emp-panel__sub">Your program requests and approvals.</p>
                  </div>
                </header>
                {notifications.length === 0 ? (
                  <p className="emp-muted emp-muted--pad">No training assignments yet.</p>
                ) : (
                  <ul className="emp-notif-list">
                    {notifications.map((n) => {
                      const st = TRAINING_STATUS[n.status] || { label: n.status, tone: 'muted' }
                      return (
                        <li key={n.assignmentId ?? `${n.programTitle}-${n.requestedAt}`} className="emp-notif">
                          <span className={`emp-notif__dot emp-notif__dot--${st.tone}`} aria-hidden />
                          <div className="emp-notif__body">
                            <div className="emp-notif__title">{n.programTitle}</div>
                            <div className="emp-notif__meta">
                              <span className={`emp-tag emp-tag--${st.tone}`}>{st.label}</span>
                              <span className="emp-notif__time">{formatInstant(n.requestedAt)}</span>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <p className="emp-footnote">
                  <i className="bi bi-info-circle" aria-hidden />
                  Updates when HR or managers process training requests.
                </p>
              </section>
            </aside>
          </div>

          <CsgtsModuleMap role="EMPLOYEE" />
        </div>
      )}
    </>
  )
}

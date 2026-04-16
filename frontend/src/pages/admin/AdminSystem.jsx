import React, { useEffect, useState } from 'react'
import ProjectGovernancePanel from '../../components/ProjectGovernancePanel.jsx'

export default function AdminSystem({
  config,
  gapRank,
  setGapRank,
  integrationsJson,
  setIntegrationsJson,
  scheduledReportingEnabled,
  setScheduledReportingEnabled,
  reportingRecipientEmail,
  setReportingRecipientEmail,
  onSaveConfig,
  onDownloadPpt,
  onDownloadCompliancePack,
  integrationHealth,
  integrationHealthLoading,
  onRefreshIntegrationHealth,
  systemIntelligence,
  systemIntelligenceLoading,
  onRefreshSystemIntelligence,
  onSaveDepartmentThresholds,
  projects,
  projectsLoading,
  jobRoles,
  onRefreshProjects,
  onCreateProject,
  onSaveProjectDeadline,
  busy
}) {
  const n = Math.min(10, Math.max(0, Number(gapRank) || 0))
  const stored = config?.gapAlertRank

  let zone = 'balanced'
  if (n <= 3) zone = 'early'
  else if (n >= 7) zone = 'strict'

  function statusBadge(status) {
    if (status === 'UP') return 'bg-success-subtle text-success-emphasis'
    if (status === 'DOWN') return 'bg-danger-subtle text-danger-emphasis'
    if (status === 'NOT_CONFIGURED') return 'bg-warning-subtle text-warning-emphasis'
    return 'bg-secondary-subtle text-secondary-emphasis'
  }

  const checkedAt = integrationHealth?.checkedAt ? new Date(integrationHealth.checkedAt).toLocaleString() : 'Not checked yet'
  const intelligenceCheckedAt = systemIntelligence?.checkedAt
    ? new Date(systemIntelligence.checkedAt).toLocaleString()
    : 'Not checked yet'
  const [departmentThresholds, setDepartmentThresholds] = useState({})
  const [deptBusy, setDeptBusy] = useState(false)
  const [deptSaveStatus, setDeptSaveStatus] = useState('')
  const [deptSaveError, setDeptSaveError] = useState('')

  useEffect(() => {
    const fromApi = systemIntelligence?.dynamicThresholdEngine?.effectiveThresholds || []
    const next = {}
    for (const row of fromApi) {
      if (row?.departmentId == null) continue
      next[String(row.departmentId)] = Number(row.threshold ?? 0)
    }
    setDepartmentThresholds(next)
  }, [systemIntelligence])

  async function saveDepartmentThresholdEditor() {
    if (!onSaveDepartmentThresholds) return
    const payload = {}
    for (const [k, v] of Object.entries(departmentThresholds)) {
      let n2 = Number(v)
      if (Number.isNaN(n2)) n2 = 0
      payload[k] = Math.max(0, Math.min(10, n2))
    }
    setDeptBusy(true)
    setDeptSaveStatus('')
    setDeptSaveError('')
    try {
      await onSaveDepartmentThresholds(payload)
      setDeptSaveStatus('Department thresholds saved.')
    } catch (e) {
      setDeptSaveError(e?.response?.data?.error || e?.message || 'Failed to save department thresholds.')
    } finally {
      setDeptBusy(false)
    }
  }

  useEffect(() => {
    if (!deptSaveStatus && !deptSaveError) return undefined
    const id = window.setTimeout(() => {
      setDeptSaveStatus('')
      setDeptSaveError('')
    }, 3000)
    return () => window.clearTimeout(id)
  }, [deptSaveStatus, deptSaveError])

  return (
    <div className="admin-sys">
      {(deptSaveStatus || deptSaveError) && (
        <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
          {deptSaveStatus && (
            <div className="toast show align-items-center text-bg-success border-0" role="status" aria-live="polite" aria-atomic="true">
              <div className="d-flex">
                <div className="toast-body">{deptSaveStatus}</div>
              </div>
            </div>
          )}
          {deptSaveError && (
            <div className="toast show align-items-center text-bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
              <div className="d-flex">
                <div className="toast-body">{deptSaveError}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <section className="admin-sys-hero" aria-labelledby="admin-sys-title">
        <div className="admin-sys-hero__glow" aria-hidden />
        <div className="admin-sys-hero__inner">
          <div className="admin-sys-hero__brand">
            <div className="admin-sys-hero__orb" aria-hidden>
              <i className="bi bi-sliders2" />
            </div>
            <div>
              <p className="admin-sys-eyebrow">Platform tuning</p>
              <h1 id="admin-sys-title" className="admin-sys-title">
                System configuration
              </h1>
              <p className="admin-sys-lead">
                Tune how aggressively AI-CSGTS surfaces skill gaps and training recommendations across the workforce.
              </p>
              <div className="admin-sys-pills">
                <span className="admin-sys-pill">
                  <i className="bi bi-lightning-charge-fill" />
                  Live policy
                </span>
                <span className="admin-sys-pill admin-sys-pill--range">
                  <i className="bi bi-0-circle" />
                  Rank scale 0–10
                </span>
                {stored != null && (
                  <span className="admin-sys-pill admin-sys-pill--saved">
                    <i className="bi bi-cloud-check" />
                    Saved: <strong>{stored}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-sys-layout">
        <section className="admin-sys-panel admin-sys-panel--primary" aria-labelledby="gap-threshold-heading">
          <header className="admin-sys-panel__head">
            <span className="admin-sys-panel__icon">
              <i className="bi bi-graph-up-arrow" />
            </span>
            <div>
              <h2 id="gap-threshold-heading" className="admin-sys-panel__title">
                Skill gap alert threshold
              </h2>
              <p className="admin-sys-panel__sub">
                When a user&apos;s computed gap rank meets or exceeds this value, recommendations and alerts prioritize closing that skill.
              </p>
            </div>
          </header>

          <form className="admin-sys-form" onSubmit={onSaveConfig}>
            <div className="admin-sys-threshold">
              <div className="admin-sys-threshold__top">
                <label className="admin-sys-label" htmlFor="admin-sys-rank-slider">
                  Threshold rank
                </label>
                <span className="admin-sys-value" aria-live="polite">
                  {n}
                  <span className="admin-sys-value__max">/10</span>
                </span>
              </div>

              <div className="admin-sys-slider-wrap">
                <input
                  id="admin-sys-rank-slider"
                  className="admin-sys-slider"
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={n}
                  onChange={(e) => setGapRank(e.target.value)}
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={n}
                />
                <div className="admin-sys-ticks" aria-hidden>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                    <span key={t} className={`admin-sys-tick ${t <= n ? 'admin-sys-tick--on' : ''}`} />
                  ))}
                </div>
              </div>

              <div className="admin-sys-zone" data-zone={zone}>
                <span className="admin-sys-zone__dot" aria-hidden />
                <span className="admin-sys-zone__text">
                  {zone === 'early' && 'Lower threshold — alerts trigger sooner (more proactive).'}
                  {zone === 'balanced' && 'Balanced — moderate sensitivity to skill gaps.'}
                  {zone === 'strict' && 'Higher threshold — only stronger gaps surface (fewer alerts).'}
                </span>
              </div>

              <div className="admin-sys-numrow">
                <label className="visually-hidden" htmlFor="admin-sys-rank-num">
                  Exact value
                </label>
                <div className="admin-sys-numfield">
                  <button
                    type="button"
                    className="admin-sys-step"
                    disabled={busy || n <= 0}
                    onClick={() => setGapRank(String(Math.max(0, n - 1)))}
                    aria-label="Decrease by one"
                  >
                    <i className="bi bi-dash-lg" />
                  </button>
                  <input
                    id="admin-sys-rank-num"
                    className="admin-sys-num"
                    type="number"
                    min={0}
                    max={10}
                    value={gapRank}
                    onChange={(e) => setGapRank(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-sys-step"
                    disabled={busy || n >= 10}
                    onClick={() => setGapRank(String(Math.min(10, n + 1)))}
                    aria-label="Increase by one"
                  >
                    <i className="bi bi-plus-lg" />
                  </button>
                </div>
                <span className="admin-sys-numhint">Integer 0–10</span>
              </div>
            </div>

            <button className="admin-sys-save" type="submit" disabled={busy}>
              <i className="bi bi-floppy-fill" />
              Save configuration
            </button>
          </form>

          <section className="admin-sys-panel admin-sys-panel--primary mt-4" aria-labelledby="integrations-heading">
            <header className="admin-sys-panel__head">
              <span className="admin-sys-panel__icon">
                <i className="bi bi-plug-fill" />
              </span>
              <div>
                <h2 id="integrations-heading" className="admin-sys-panel__title">
                  Integrations &amp; LDAP (MVP stubs)
                </h2>
                <p className="admin-sys-panel__sub">
                  Store connection hints as JSON. Real LDAP/SSO and Jira/Asana OAuth belong behind secrets management in production.
                </p>
              </div>
            </header>
            <label className="admin-sys-label" htmlFor="admin-integrations-json">
              integrationsJson
            </label>
            <textarea
              id="admin-integrations-json"
              className="form-control font-monospace small mb-3"
              rows={10}
              value={integrationsJson}
              onChange={(e) => setIntegrationsJson(e.target.value)}
              spellCheck={false}
            />
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="admin-sched-rep"
                checked={scheduledReportingEnabled}
                onChange={(e) => setScheduledReportingEnabled(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="admin-sched-rep">
                Weekly scheduled skill-health PPTX (writes under JVM temp; email hook logs recipient below)
              </label>
            </div>
            <label className="admin-sys-label" htmlFor="admin-report-email">
              Reporting recipient email
            </label>
            <input
              id="admin-report-email"
              type="email"
              className="form-control mb-3"
              placeholder="exec@company.com"
              value={reportingRecipientEmail}
              onChange={(e) => setReportingRecipientEmail(e.target.value)}
            />
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-primary btn-sm" disabled={busy} onClick={() => onDownloadPpt?.()}>
                <i className="bi bi-file-earmark-slides me-1" />
                Download skill-health PPTX now
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={busy}
                onClick={() => onDownloadCompliancePack?.()}
              >
                <i className="bi bi-file-zip me-1" />
                Audit compliance pack (ZIP)
              </button>
            </div>
            <p className="small text-body-secondary mt-2 mb-0">
              Use <strong>Save configuration</strong> above to persist integrations JSON and scheduling flags.
            </p>

            <div className="mt-3 pt-3 border-top">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className="h6 mb-0">Integration health status</h3>
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm"
                  disabled={busy || integrationHealthLoading}
                  onClick={() => onRefreshIntegrationHealth?.()}
                >
                  <i className="bi bi-arrow-clockwise me-1" />
                  {integrationHealthLoading ? 'Checking…' : 'Check now'}
                </button>
              </div>
              <p className="small text-body-secondary mb-2">Last checked: {checkedAt}</p>
              <div className="d-flex flex-column gap-2">
                {['jira', 'asana', 'ldap'].map((k) => {
                  const item = integrationHealth?.[k] || { status: 'NOT_CONFIGURED', configured: false, missing: `${k} config` }
                  return (
                    <div key={k} className="d-flex align-items-start justify-content-between border rounded px-2 py-2">
                      <div>
                        <div className="fw-semibold text-uppercase">{k}</div>
                        <div className="small text-body-secondary">
                          {item.target || item.missing || item.error || 'No details'}
                        </div>
                      </div>
                      <span className={`badge ${statusBadge(item.status)}`}>{item.status}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 pt-3 border-top">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className="h6 mb-0">System intelligence controller</h3>
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm"
                  disabled={busy || systemIntelligenceLoading}
                  onClick={() => onRefreshSystemIntelligence?.()}
                >
                  <i className="bi bi-arrow-clockwise me-1" />
                  {systemIntelligenceLoading ? 'Checking…' : 'Refresh'}
                </button>
              </div>
              <p className="small text-body-secondary mb-2">Last checked: {intelligenceCheckedAt}</p>
              {systemIntelligence ? (
                <div className="d-flex flex-column gap-2">
                  <div className="border rounded px-2 py-2">
                    <div className="fw-semibold">RBAC matrix visibility</div>
                    <div className="small text-body-secondary">
                      Roles mapped with {systemIntelligence?.rbac?.permissionCount ?? 0} permission definitions.
                    </div>
                  </div>
                  <div className="border rounded px-2 py-2">
                    <div className="fw-semibold">Dynamic threshold engine</div>
                    <div className="small text-body-secondary">
                      Global rank: {systemIntelligence?.dynamicThresholdEngine?.globalGapThreshold ?? '-'} | Department overrides:
                      {' '}
                      {Object.keys(systemIntelligence?.dynamicThresholdEngine?.departmentGapThresholds || {}).length}
                    </div>
                    <div className="mt-2">
                      {(systemIntelligence?.dynamicThresholdEngine?.effectiveThresholds || []).map((row) => (
                        <div key={row.departmentId} className="d-flex align-items-center justify-content-between gap-2 mb-2">
                          <span className="small">{row.departmentName}</span>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            className="form-control form-control-sm"
                            style={{ width: 96 }}
                            value={departmentThresholds[String(row.departmentId)] ?? row.threshold ?? 0}
                            disabled={busy || deptBusy}
                            onChange={(e) => {
                              const val = e.target.value
                              setDepartmentThresholds((prev) => ({ ...prev, [String(row.departmentId)]: val }))
                            }}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        disabled={busy || deptBusy}
                        onClick={saveDepartmentThresholdEditor}
                      >
                        <i className="bi bi-floppy me-1" />
                        {deptBusy ? 'Saving…' : 'Save department thresholds'}
                      </button>
                    </div>
                  </div>
                  <div className="border rounded px-2 py-2">
                    <div className="fw-semibold">Data integrity rules</div>
                    <div className="small text-body-secondary">
                      Duplicate skill groups: {systemIntelligence?.dataIntegrity?.duplicateSkillNameGroups?.length ?? 0},
                      {' '}invalid certificate type count: {systemIntelligence?.dataIntegrity?.invalidCertificationContentTypeCount ?? 0}
                    </div>
                  </div>
                  <div className="border rounded px-2 py-2">
                    <div className="fw-semibold">AI governance</div>
                    <div className="small text-body-secondary">
                      Model: {systemIntelligence?.aiGovernance?.model || 'n/a'}, accuracy target:
                      {' '}{systemIntelligence?.aiGovernance?.accuracyTargetPct ?? '-'}%, bias alert:
                      {' '}{systemIntelligence?.aiGovernance?.biasAlertThresholdPct ?? '-'}%
                    </div>
                  </div>
                  <div className="border rounded px-2 py-2">
                    <div className="fw-semibold">Cross-role intelligent flow</div>
                    <div className="small text-body-secondary mb-1">
                      {(systemIntelligence?.crossRoleIntelligentFlow?.flow || []).join(' -> ')}
                    </div>
                    <div className="small text-body-secondary">
                      {systemIntelligence?.crossRoleIntelligentFlow?.closedLoopSummary}
                    </div>
                  </div>
                  <div className="border rounded px-2 py-2">
                    <div className="fw-semibold">Core professional architecture</div>
                    <div className="small text-body-secondary mb-1">
                      Skill ontology: {(systemIntelligence?.coreArchitecture?.skillOntologyFramework || []).join(', ')}
                    </div>
                    <div className="small text-body-secondary mb-1">
                      AI layers: {(systemIntelligence?.coreArchitecture?.aiEngineLayers || []).map((l) => l.name).join(' -> ')}
                    </div>
                    <div className="small text-body-secondary">
                      LMS/PM integrations: Coursera {systemIntelligence?.coreArchitecture?.integrationEcosystem?.lms?.coursera?.status || 'N/A'},
                      {' '}Udemy {systemIntelligence?.coreArchitecture?.integrationEcosystem?.lms?.udemy?.status || 'N/A'},
                      {' '}Jira {systemIntelligence?.coreArchitecture?.integrationEcosystem?.pmTools?.jira?.status || 'N/A'},
                      {' '}Asana {systemIntelligence?.coreArchitecture?.integrationEcosystem?.pmTools?.asana?.status || 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="small text-body-secondary">System intelligence data unavailable.</div>
              )}
            </div>

            <div className="mt-3 pt-3 border-top">
              <ProjectGovernancePanel
                busy={busy}
                loading={projectsLoading}
                projects={projects}
                jobRoles={jobRoles}
                onRefresh={onRefreshProjects}
                onCreateProject={onCreateProject}
                onSaveProjectDeadline={onSaveProjectDeadline}
                labelClassName="admin-sys-label"
                inputClassName="form-control form-control-sm"
                selectClassName="form-select form-select-sm"
                buttonClassName="btn btn-primary btn-sm"
                secondaryButtonClassName="btn btn-outline-secondary btn-sm"
              />
            </div>
          </section>
        </section>

        <aside className="admin-sys-aside">
          <div className="admin-sys-card">
            <h3 className="admin-sys-card__title">
              <i className="bi bi-info-circle-fill" aria-hidden />
              How this works
            </h3>
            <ul className="admin-sys-list">
              <li>
                <strong>Gap rank</strong> summarizes how far a skill level is from what a role requires.
              </li>
              <li>
                Raising the threshold reduces noise; lowering it surfaces more development opportunities.
              </li>
              <li>
                Changes apply to new recommendations and dashboard signals after save.
              </li>
            </ul>
          </div>
          <div className="admin-sys-card admin-sys-card--muted">
            <h3 className="admin-sys-card__title">
              <i className="bi bi-shield-check" aria-hidden />
              Governance
            </h3>
            <p className="admin-sys-card__p">
              Only administrators can change platform thresholds. Consider documenting your chosen policy for HR and managers.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

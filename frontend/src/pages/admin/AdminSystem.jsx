import React from 'react'

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
  busy
}) {
  const n = Math.min(10, Math.max(0, Number(gapRank) || 0))
  const stored = config?.gapAlertRank

  let zone = 'balanced'
  if (n <= 3) zone = 'early'
  else if (n >= 7) zone = 'strict'

  return (
    <div className="admin-sys">
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

import React from 'react'
import CsgtsModuleMap from '../dashboard/CsgtsModuleMap.jsx'
import { formatInstant } from './adminHelpers.js'

function roleAccent(role) {
  switch (role) {
    case 'ADMIN':
      return { grad: 'linear-gradient(90deg, #d97706, #fbbf24)', glow: 'rgba(245, 158, 11, 0.35)' }
    case 'HR':
      return { grad: 'linear-gradient(90deg, #059669, #34d399)', glow: 'rgba(16, 185, 129, 0.35)' }
    case 'MANAGER':
      return { grad: 'linear-gradient(90deg, #7c3aed, #a78bfa)', glow: 'rgba(139, 92, 246, 0.35)' }
    case 'EMPLOYEE':
      return { grad: 'linear-gradient(90deg, #2563eb, #60a5fa)', glow: 'rgba(59, 130, 246, 0.35)' }
    default:
      return { grad: 'linear-gradient(90deg, #64748b, #94a3b8)', glow: 'rgba(100, 116, 139, 0.3)' }
  }
}

function auditVerb(action) {
  if (!action) return 'event'
  const a = action.toUpperCase()
  if (a.includes('LOGIN') || a.includes('AUTH')) return 'access'
  if (a.includes('CREATE') || a.includes('POST')) return 'create'
  if (a.includes('UPDATE') || a.includes('PATCH')) return 'update'
  if (a.includes('DELETE')) return 'delete'
  if (a.includes('IMPORT')) return 'import'
  return 'action'
}

export default function AdminOverview({ stats, roleBars, deptBars, auditRecent, onRefresh, disabled }) {
  const total = stats?.totalUsers ?? 0
  const active = stats?.activeUsers ?? 0
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0
  const inactive = stats?.inactiveUsers ?? Math.max(0, total - active)
  const auditRows = (auditRecent || []).slice(0, 8)

  return (
    <div className="admin-overview">
      <section className="admin-ov-hero" aria-labelledby="admin-ov-title">
        <div className="admin-ov-hero__glow" aria-hidden />
        <div className="admin-ov-hero__grid">
          <div className="admin-ov-hero__brand">
            <div className="admin-ov-hero__orb" aria-hidden>
              <i className="bi bi-shield-lock-fill" />
            </div>
            <div>
              <p className="admin-ov-eyebrow">Control plane</p>
              <h1 id="admin-ov-title" className="admin-ov-title">
                Operations overview
              </h1>
              <p className="admin-ov-lead">
                Live snapshot of users, org structure, and audit velocity — optimized for enterprise governance.
              </p>
              <div className="admin-ov-pills">
                <span className="admin-ov-pill">
                  <i className="bi bi-diagram-3" /> RBAC
                </span>
                <span className="admin-ov-pill">
                  <i className="bi bi-journal-check" /> Audit trail
                </span>
                <span className="admin-ov-pill">
                  <i className="bi bi-cloud-arrow-up" /> Import / export
                </span>
              </div>
            </div>
          </div>
          <div className="admin-ov-hero__actions">
            <button
              type="button"
              className="admin-ov-btn admin-ov-btn--primary"
              onClick={onRefresh}
              disabled={disabled}
              title="Reload directory, stats, and configuration"
            >
              <i className="bi bi-arrow-clockwise" />
              Sync data
            </button>
            <p className="admin-ov-hint">
              <i className="bi bi-lightning-charge-fill" /> Refreshes users, departments, and KPIs
            </p>
          </div>
        </div>
      </section>

      <section className="admin-ov-kpis" aria-label="Key metrics">
        <article className="admin-ov-kpi admin-ov-kpi--indigo">
          <div className="admin-ov-kpi__icon">
            <i className="bi bi-people-fill" />
          </div>
          <div className="admin-ov-kpi__body">
            <span className="admin-ov-kpi__value">{total}</span>
            <span className="admin-ov-kpi__label">Total users</span>
            <span className="admin-ov-kpi__meta">
              {inactive > 0 ? `${inactive} inactive` : 'All accounts active'}
            </span>
          </div>
        </article>
        <article className="admin-ov-kpi admin-ov-kpi--emerald">
          <div className="admin-ov-kpi__icon">
            <i className="bi bi-person-check-fill" />
          </div>
          <div className="admin-ov-kpi__body">
            <span className="admin-ov-kpi__value">{active}</span>
            <span className="admin-ov-kpi__label">Active accounts</span>
            <span className="admin-ov-kpi__meta">{activePct}% of directory</span>
          </div>
        </article>
        <article className="admin-ov-kpi admin-ov-kpi--sky">
          <div className="admin-ov-kpi__icon">
            <i className="bi bi-building-fill" />
          </div>
          <div className="admin-ov-kpi__body">
            <span className="admin-ov-kpi__value">{stats?.departmentCount ?? 0}</span>
            <span className="admin-ov-kpi__label">Departments</span>
            <span className="admin-ov-kpi__meta">Org units</span>
          </div>
        </article>
        <article className="admin-ov-kpi admin-ov-kpi--amber">
          <div className="admin-ov-kpi__icon">
            <i className="bi bi-clock-history" />
          </div>
          <div className="admin-ov-kpi__body">
            <span className="admin-ov-kpi__value">{stats?.auditEventsLast24h ?? 0}</span>
            <span className="admin-ov-kpi__label">Audit events (24h)</span>
            <span className="admin-ov-kpi__meta">Security telemetry</span>
          </div>
        </article>
      </section>

      <div className="admin-ov-split">
        <section className="admin-ov-card" aria-labelledby="ov-role-head">
          <header className="admin-ov-card__head">
            <div className="admin-ov-card__title-wrap">
              <span className="admin-ov-card__icon">
                <i className="bi bi-pie-chart-fill" />
              </span>
              <div>
                <h2 id="ov-role-head" className="admin-ov-card__title">
                  Users by role
                </h2>
                <p className="admin-ov-card__sub">Distribution across platform roles</p>
              </div>
            </div>
          </header>
          <ul className="admin-ov-bars">
            {roleBars.map(({ role, n, pct }) => {
              const { grad, glow } = roleAccent(role)
              return (
                <li key={role} className="admin-ov-bar-row">
                  <div className="admin-ov-bar-row__label">
                    <span className="admin-ov-role-tag">{role}</span>
                    <span className="admin-ov-bar-row__n">{n}</span>
                  </div>
                  <div className="admin-ov-bar-track">
                    <div
                      className="admin-ov-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: grad,
                        boxShadow: n > 0 ? `0 0 20px ${glow}` : 'none'
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="admin-ov-card" aria-labelledby="ov-dept-head">
          <header className="admin-ov-card__head">
            <div className="admin-ov-card__title-wrap">
              <span className="admin-ov-card__icon admin-ov-card__icon--teal">
                <i className="bi bi-building" />
              </span>
              <div>
                <h2 id="ov-dept-head" className="admin-ov-card__title">
                  Headcount by department
                </h2>
                <p className="admin-ov-card__sub">Relative staffing load</p>
              </div>
            </div>
          </header>
          <ul className="admin-ov-bars">
            {deptBars.length === 0 ? (
              <li className="admin-ov-empty">No departments yet</li>
            ) : (
              deptBars.map(({ id, name, n, pct }) => (
                <li key={id} className="admin-ov-bar-row">
                  <div className="admin-ov-bar-row__label">
                    <span className="admin-ov-dept-name" title={name}>
                      {name}
                    </span>
                    <span className="admin-ov-bar-row__n">{n}</span>
                  </div>
                  <div className="admin-ov-bar-track">
                    <div
                      className="admin-ov-bar-fill admin-ov-bar-fill--dept"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="admin-ov-card admin-ov-card--wide" aria-labelledby="ov-activity-head">
        <header className="admin-ov-card__head admin-ov-card__head--inline">
          <div className="admin-ov-card__title-wrap">
            <span className="admin-ov-card__icon admin-ov-card__icon--rose">
              <i className="bi bi-activity" />
            </span>
            <div>
              <h2 id="ov-activity-head" className="admin-ov-card__title">
                Recent activity
              </h2>
              <p className="admin-ov-card__sub">Latest audit events across the platform</p>
            </div>
          </div>
        </header>
        {!auditRows.length ? (
          <p className="admin-ov-empty admin-ov-empty--padded">No audit events recorded yet.</p>
        ) : (
          <ol className="admin-ov-timeline">
            {auditRows.map((row, idx) => (
              <li key={row.id ?? `${row.createdAt}-${row.action}-${idx}`} className="admin-ov-tl-item">
                <div className="admin-ov-tl-meta">
                  <time className="admin-ov-tl-time">{formatInstant(row.createdAt)}</time>
                </div>
                <div className="admin-ov-tl-rail" aria-hidden>
                  <span className="admin-ov-tl-dot" />
                  {idx < auditRows.length - 1 && <span className="admin-ov-tl-line" />}
                </div>
                <div className="admin-ov-tl-body">
                  <div className="admin-ov-tl-top">
                    <span className={`admin-ov-tl-verb admin-ov-tl-verb--${auditVerb(row.action)}`}>
                      {auditVerb(row.action)}
                    </span>
                    <span className="admin-ov-tl-action">{row.action}</span>
                  </div>
                  <div className="admin-ov-tl-actor">
                    <i className="bi bi-person-badge" />
                    {row.actor?.email || 'System'}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <CsgtsModuleMap role="ADMIN" />
    </div>
  )
}

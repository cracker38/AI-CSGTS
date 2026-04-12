import React from 'react'
import { formatInstant } from './adminHelpers.js'

function actionTone(action) {
  if (!action) return 'neutral'
  const a = action.toUpperCase()
  if (a.includes('LOGIN') || a.includes('AUTH') || a.includes('LOGOUT')) return 'access'
  if (a.includes('CREATE') || a.includes('POST') || a.includes('REGISTER')) return 'create'
  if (a.includes('UPDATE') || a.includes('PATCH') || a.includes('SAVE')) return 'update'
  if (a.includes('DELETE') || a.includes('REMOVE')) return 'delete'
  if (a.includes('IMPORT')) return 'import'
  return 'neutral'
}

export default function AdminAudit({
  auditQ,
  setAuditQ,
  auditLoading,
  auditPageData,
  auditPage,
  setAuditPage,
  onExportCsv
}) {
  const rows = auditPageData?.content || []
  const total = auditPageData?.totalElements ?? 0
  const totalPages = Math.max(1, auditPageData?.totalPages ?? 1)
  const pageSize = auditPageData?.size ?? 20
  const pageNum = auditPageData?.number != null ? auditPageData.number + 1 : auditPage + 1

  return (
    <div className="admin-audit">
      <section className="admin-audit-hero" aria-labelledby="admin-audit-title">
        <div className="admin-audit-hero__glow" aria-hidden />
        <div className="admin-audit-hero__inner">
          <div className="admin-audit-hero__brand">
            <div className="admin-audit-hero__orb" aria-hidden>
              <i className="bi bi-journal-bookmark-fill" />
            </div>
            <div>
              <p className="admin-audit-eyebrow">Compliance & security</p>
              <h1 id="admin-audit-title" className="admin-audit-title">
                Audit log
              </h1>
              <p className="admin-audit-lead">
                Immutable trail of administrative and platform actions — filter by keyword, export the current page, and paginate through history.
              </p>
              <div className="admin-audit-pills">
                <span className="admin-audit-pill">
                  <i className="bi bi-database" />
                  <strong>{total.toLocaleString()}</strong> events indexed
                </span>
                <span className="admin-audit-pill admin-audit-pill--page">
                  <i className="bi bi-file-earmark-text" />
                  {pageSize} per page
                </span>
                <span className="admin-audit-pill admin-audit-pill--shield">
                  <i className="bi bi-shield-lock" />
                  Admin-only
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-audit-panel">
        <div className="admin-audit-toolbar">
          <div className="admin-audit-search-wrap">
            <i className="bi bi-funnel-fill admin-audit-search-icon" aria-hidden />
            <input
              type="search"
              className="admin-audit-search"
              placeholder="Filter by action (keyword)…"
              value={auditQ}
              onChange={(e) => setAuditQ(e.target.value)}
              aria-label="Filter audit log"
            />
            {auditQ.trim() && (
              <button type="button" className="admin-audit-clear" onClick={() => setAuditQ('')} aria-label="Clear filter">
                <i className="bi bi-x-lg" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="admin-audit-export"
            onClick={onExportCsv}
            disabled={!rows.length}
          >
            <i className="bi bi-download" />
            Export page CSV
          </button>
        </div>

        {auditLoading ? (
          <div className="admin-audit-loading" role="status">
            <div className="admin-audit-spinner" />
            <span>Loading audit events…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="admin-audit-empty">
            <div className="admin-audit-empty__icon">
              <i className="bi bi-inbox" />
            </div>
            <p className="admin-audit-empty__title">No events match</p>
            <p className="admin-audit-empty__text">
              {auditQ.trim() ? 'Try a different filter or clear the search.' : 'No audit records on this page.'}
            </p>
          </div>
        ) : (
          <>
            <div className="admin-audit-table-wrap">
              <table className="admin-audit-table">
                <thead>
                  <tr>
                    <th scope="col" className="admin-audit-th admin-audit-th--time">
                      When
                    </th>
                    <th scope="col" className="admin-audit-th">
                      Action
                    </th>
                    <th scope="col" className="admin-audit-th">
                      Actor
                    </th>
                    <th scope="col" className="admin-audit-th admin-audit-th--details">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const tone = actionTone(a.action)
                    return (
                      <tr key={a.id}>
                        <td className="admin-audit-td admin-audit-td--time">
                          <time dateTime={a.createdAt}>{formatInstant(a.createdAt)}</time>
                        </td>
                        <td className="admin-audit-td">
                          <span className={`admin-audit-badge admin-audit-badge--${tone}`}>{a.action}</span>
                        </td>
                        <td className="admin-audit-td">
                          <span className="admin-audit-actor">
                            <i className="bi bi-person-badge" aria-hidden />
                            {a.actor?.email || '—'}
                          </span>
                        </td>
                        <td className="admin-audit-td admin-audit-td--details">
                          <span className="admin-audit-details" title={a.details || ''}>
                            {a.details || '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <footer className="admin-audit-footer">
              <p className="admin-audit-meta">
                <strong>{total.toLocaleString()}</strong> total events
                <span className="admin-audit-meta__dot">·</span>
                Page <strong>{pageNum}</strong> of {totalPages}
                <span className="admin-audit-meta__dot">·</span>
                {rows.length} on this page
              </p>
              <div className="admin-audit-pager">
                <button
                  type="button"
                  className="admin-audit-page-btn"
                  disabled={auditPage <= 0}
                  onClick={() => setAuditPage((p) => p - 1)}
                >
                  <i className="bi bi-chevron-left" />
                  Previous
                </button>
                <button
                  type="button"
                  className="admin-audit-page-btn"
                  disabled={!auditPageData || auditPage >= totalPages - 1}
                  onClick={() => setAuditPage((p) => p + 1)}
                >
                  Next
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

import React from 'react'
import { ALL_ROLES } from './adminConstants.js'

function groupAccent(group) {
  switch (group) {
    case 'Administration':
      return 'admin-perm-group--admin'
    case 'HR':
      return 'admin-perm-group--hr'
    case 'Manager':
      return 'admin-perm-group--mgr'
    case 'Executive':
      return 'admin-perm-group--other'
    default:
      return 'admin-perm-group--other'
  }
}

export default function AdminPermissions({
  matrixLoading,
  rolePerms,
  permissionsTotal,
  permRole,
  setPermRole,
  permSelection,
  togglePermCode,
  saveRolePermissions,
  permSearch,
  setPermSearch,
  groupedPermissions,
  newPermCode,
  setNewPermCode,
  newPermDesc,
  setNewPermDesc,
  createPermission,
  busy
}) {
  const selected = permSelection.size
  const totalCatalog = permissionsTotal ?? 0

  return (
    <div className="admin-perm">
      <section className="admin-perm-hero" aria-labelledby="admin-perm-title">
        <div className="admin-perm-hero__glow" aria-hidden />
        <div className="admin-perm-hero__inner">
          <div className="admin-perm-hero__brand">
            <div className="admin-perm-hero__orb" aria-hidden>
              <i className="bi bi-shield-lock-fill" />
            </div>
            <div>
              <p className="admin-perm-eyebrow">Role-based access</p>
              <h1 id="admin-perm-title" className="admin-perm-title">
                Permissions
              </h1>
              <p className="admin-perm-lead">
                Map capability codes to each platform role. Saving replaces the full permission set for the selected role — plan changes carefully for ADMIN.
              </p>
              <div className="admin-perm-pills">
                <span className="admin-perm-pill">
                  <i className="bi bi-list-check" />
                  <strong>{totalCatalog}</strong> in catalog
                </span>
                <span className="admin-perm-pill admin-perm-pill--sel">
                  <i className="bi bi-check2-square" />
                  <strong>{selected}</strong> selected for role
                </span>
                <span className="admin-perm-pill admin-perm-pill--warn">
                  <i className="bi bi-exclamation-triangle" />
                  Destructive save
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {matrixLoading && (
        <div className="admin-perm-loading" role="status">
          <div className="admin-perm-spinner" />
          <span>Loading permission matrix…</span>
        </div>
      )}

      {!matrixLoading && rolePerms && (
        <div className="admin-perm-layout">
          <section className="admin-perm-matrix" aria-labelledby="matrix-heading">
            <header className="admin-perm-matrix__head">
              <div>
                <h2 id="matrix-heading" className="admin-perm-matrix__title">
                  <i className="bi bi-grid-3x3-gap" aria-hidden />
                  Role matrix
                </h2>
                <p className="admin-perm-matrix__sub">
                  <strong className="admin-perm-role-label">{permRole}</strong> — {selected} permission{selected === 1 ? '' : 's'} enabled
                </p>
              </div>
              <div className="admin-perm-matrix__actions">
                <label className="visually-hidden" htmlFor="admin-perm-role-select">
                  Target role
                </label>
                <select
                  id="admin-perm-role-select"
                  className="admin-perm-role-select"
                  value={permRole}
                  onChange={(e) => setPermRole(e.target.value)}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button type="button" className="admin-perm-save" onClick={saveRolePermissions} disabled={busy}>
                  <i className="bi bi-floppy-fill" />
                  Save mapping
                </button>
              </div>
            </header>

            <div className="admin-perm-search-wrap">
              <i className="bi bi-search admin-perm-search-icon" aria-hidden />
              <input
                type="search"
                className="admin-perm-search"
                placeholder="Search code or description…"
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
              />
            </div>

            <div className="admin-perm-scroll">
              {groupedPermissions.length === 0 ? (
                <p className="admin-perm-empty">No permissions match your search.</p>
              ) : (
                groupedPermissions.map(([group, items]) => (
                  <div key={group} className={`admin-perm-group ${groupAccent(group)}`}>
                    <h3 className="admin-perm-group__title">{group}</h3>
                    <ul className="admin-perm-list">
                      {items.map((p) => (
                        <li key={p.id}>
                          <label className="admin-perm-item" htmlFor={`perm-${p.id}`}>
                            <input
                              type="checkbox"
                              className="admin-perm-checkbox"
                              checked={permSelection.has(p.code)}
                              onChange={(e) => togglePermCode(p.code, e.target.checked)}
                              id={`perm-${p.id}`}
                            />
                            <span className="admin-perm-item__body">
                              <span className="admin-perm-code">{p.code}</span>
                              {p.description ? <span className="admin-perm-desc">{p.description}</span> : null}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="admin-perm-aside">
            <div className="admin-perm-create">
              <div className="admin-perm-create__icon" aria-hidden>
                <i className="bi bi-plus-lg" />
              </div>
              <h3 className="admin-perm-create__title">Create permission</h3>
              <p className="admin-perm-create__sub">Add a new code to the global catalog, then map it to roles.</p>
              <form className="admin-perm-form" onSubmit={createPermission}>
                <label className="admin-perm-field">
                  <span className="admin-perm-label">Code</span>
                  <input
                    className="admin-perm-input admin-perm-input--mono"
                    value={newPermCode}
                    onChange={(e) => setNewPermCode(e.target.value)}
                    placeholder="CUSTOM_REPORT_VIEW"
                    autoComplete="off"
                  />
                </label>
                <label className="admin-perm-field">
                  <span className="admin-perm-label">Description (optional)</span>
                  <input className="admin-perm-input" value={newPermDesc} onChange={(e) => setNewPermDesc(e.target.value)} />
                </label>
                <button className="admin-perm-add" type="submit" disabled={busy}>
                  <i className="bi bi-plus-circle-fill" />
                  Add permission
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

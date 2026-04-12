import React from 'react'
import { ADMIN_CREATE_ROLES, ALL_ROLES } from './adminConstants.js'

function roleBadgeClass(role) {
  switch (role) {
    case 'ADMIN':
      return 'admin-usr-role admin-usr-role--admin'
    case 'HR':
      return 'admin-usr-role admin-usr-role--hr'
    case 'MANAGER':
      return 'admin-usr-role admin-usr-role--manager'
    case 'EMPLOYEE':
      return 'admin-usr-role admin-usr-role--employee'
    default:
      return 'admin-usr-role admin-usr-role--other'
  }
}

export default function AdminUsers({
  stats,
  me,
  busy,
  departments,
  jobRoles,
  deptById,
  jobRoleById,
  cuName,
  setCuName,
  cuEmail,
  setCuEmail,
  cuPass,
  setCuPass,
  cuRole,
  setCuRole,
  cuDept,
  setCuDept,
  cuJobRole,
  setCuJobRole,
  onCreateUser,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
  userDeptFilter,
  setUserDeptFilter,
  userActiveFilter,
  setUserActiveFilter,
  userSort,
  sortHeader,
  pagedUsers,
  filteredUsers,
  safeUserPage,
  userTotalPages,
  setUserPage,
  userPageSize,
  setUserPageSize,
  onImportCsv,
  onExportCsv,
  onToggleActive
}) {
  const total = stats?.totalUsers ?? 0
  const active = stats?.activeUsers ?? 0
  const filteredCount = filteredUsers.length

  return (
    <div className="admin-users">
      <section className="admin-usr-hero" aria-labelledby="admin-usr-title">
        <div className="admin-usr-hero__glow" aria-hidden />
        <div className="admin-usr-hero__grid">
          <div className="admin-usr-hero__brand">
            <div className="admin-usr-hero__orb" aria-hidden>
              <i className="bi bi-people-fill" />
            </div>
            <div>
              <p className="admin-usr-eyebrow">Identity & access</p>
              <h1 id="admin-usr-title" className="admin-usr-title">
                User directory
              </h1>
              <p className="admin-usr-lead">
                Provision accounts, map org structure, and govern activation — with import/export for bulk operations.
              </p>
              <div className="admin-usr-stat-strip">
                <span className="admin-usr-stat-pill">
                  <i className="bi bi-database" />
                  <strong>{total}</strong> in tenant
                </span>
                <span className="admin-usr-stat-pill admin-usr-stat-pill--ok">
                  <i className="bi bi-check-circle" />
                  <strong>{active}</strong> active
                </span>
                <span className="admin-usr-stat-pill admin-usr-stat-pill--filter">
                  <i className="bi bi-funnel" />
                  <strong>{filteredCount}</strong> match filters
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-usr-layout">
        <aside className="admin-usr-aside">
          <div className="admin-usr-panel admin-usr-panel--create">
            <header className="admin-usr-panel__head">
              <span className="admin-usr-panel__icon">
                <i className="bi bi-person-plus-fill" />
              </span>
              <div>
                <h2 className="admin-usr-panel__title">Create user</h2>
                <p className="admin-usr-panel__sub">All roles including employees</p>
              </div>
            </header>
            <form onSubmit={onCreateUser} className="admin-usr-form">
              <label className="admin-usr-field">
                <span className="admin-usr-label">Full name</span>
                <input
                  className="admin-usr-input"
                  value={cuName}
                  onChange={(e) => setCuName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
              <label className="admin-usr-field">
                <span className="admin-usr-label">Email</span>
                <input
                  type="email"
                  className="admin-usr-input"
                  value={cuEmail}
                  onChange={(e) => setCuEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label className="admin-usr-field">
                <span className="admin-usr-label">Temporary password</span>
                <input
                  type="password"
                  className="admin-usr-input"
                  value={cuPass}
                  onChange={(e) => setCuPass(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <label className="admin-usr-field">
                <span className="admin-usr-label">Role</span>
                <select className="admin-usr-input admin-usr-input--select" value={cuRole} onChange={(e) => setCuRole(e.target.value)}>
                  {ADMIN_CREATE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-usr-field">
                <span className="admin-usr-label">Department</span>
                <select className="admin-usr-input admin-usr-input--select" value={cuDept} onChange={(e) => setCuDept(e.target.value)} required>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-usr-field">
                <span className="admin-usr-label">Job role (optional)</span>
                <select className="admin-usr-input admin-usr-input--select" value={cuJobRole} onChange={(e) => setCuJobRole(e.target.value)}>
                  <option value="">— None —</option>
                  {jobRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="admin-usr-submit" type="submit" disabled={busy}>
                <i className="bi bi-plus-lg" />
                Create user
              </button>
            </form>
            <p className="admin-usr-footnote">
              <i className="bi bi-info-circle" />
              Employees are created here (or CSV import). Managers and HR may also use the public staff registration page. Bulk CSV:{' '}
              <code>name,email,password,role,departmentId,jobRoleId</code>
            </p>
          </div>
        </aside>

        <section className="admin-usr-main">
          <div className="admin-usr-panel admin-usr-panel--directory">
            <header className="admin-usr-panel__head admin-usr-panel__head--row">
              <div className="admin-usr-panel__head-left">
                <span className="admin-usr-panel__icon admin-usr-panel__icon--violet">
                  <i className="bi bi-grid-3x3-gap-fill" />
                </span>
                <div>
                  <h2 className="admin-usr-panel__title">Directory</h2>
                  <p className="admin-usr-panel__sub">Search, filter, sort, and manage activation</p>
                </div>
              </div>
              <div className="admin-usr-toolbar-actions">
                <label className="admin-usr-btn admin-usr-btn--ghost">
                  <input type="file" accept=".csv,text/csv" className="d-none" onChange={onImportCsv} disabled={busy} />
                  <i className="bi bi-upload" />
                  Import CSV
                </label>
                <button type="button" className="admin-usr-btn admin-usr-btn--ghost" onClick={onExportCsv} disabled={!filteredCount}>
                  <i className="bi bi-download" />
                  Export CSV
                </button>
              </div>
            </header>

            <div className="admin-usr-filters">
              <div className="admin-usr-search-wrap">
                <i className="bi bi-search admin-usr-search-icon" aria-hidden />
                <input
                  type="search"
                  className="admin-usr-search"
                  placeholder="Search by name or email…"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setUserPage(0)
                  }}
                />
              </div>
              <div className="admin-usr-filter-grid">
                <select
                  className="admin-usr-input admin-usr-input--select admin-usr-input--compact"
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value)
                    setUserPage(0)
                  }}
                >
                  <option value="">All roles</option>
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  className="admin-usr-input admin-usr-input--select admin-usr-input--compact"
                  value={userDeptFilter}
                  onChange={(e) => {
                    setUserDeptFilter(e.target.value)
                    setUserPage(0)
                  }}
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  className="admin-usr-input admin-usr-input--select admin-usr-input--compact"
                  value={userActiveFilter}
                  onChange={(e) => {
                    setUserActiveFilter(e.target.value)
                    setUserPage(0)
                  }}
                >
                  <option value="all">Active + inactive</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>
            </div>

            <div className="admin-usr-table-wrap">
              <table className="admin-usr-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <button type="button" className="admin-usr-th" onClick={() => sortHeader('name')}>
                        Name
                        {userSort.key === 'name' ? <span className="admin-usr-sort">{userSort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                      </button>
                    </th>
                    <th scope="col">
                      <button type="button" className="admin-usr-th" onClick={() => sortHeader('email')}>
                        Email
                        {userSort.key === 'email' ? <span className="admin-usr-sort">{userSort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                      </button>
                    </th>
                    <th scope="col">
                      <button type="button" className="admin-usr-th" onClick={() => sortHeader('role')}>
                        Role
                        {userSort.key === 'role' ? <span className="admin-usr-sort">{userSort.dir === 'asc' ? '↑' : '↓'}</span> : null}
                      </button>
                    </th>
                    <th scope="col">Department</th>
                    <th scope="col">Job role</th>
                    <th scope="col" className="admin-usr-th--narrow">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="admin-usr-name">{u.name}</span>
                      </td>
                      <td>
                        <span className="admin-usr-email">{u.email}</span>
                      </td>
                      <td>
                        <span className={roleBadgeClass(u.role)}>{u.role}</span>
                      </td>
                      <td>
                        <span className="admin-usr-muted">{deptById.get(u.departmentId) ?? '—'}</span>
                      </td>
                      <td>
                        <span className="admin-usr-muted">{u.jobRoleId != null ? jobRoleById.get(u.jobRoleId) ?? u.jobRoleId : '—'}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`admin-usr-toggle ${u.active ? 'admin-usr-toggle--on' : 'admin-usr-toggle--off'}`}
                          disabled={busy || (me && u.id === me.id)}
                          onClick={() => onToggleActive(u)}
                          title={me && u.id === me.id ? 'Cannot change your own status here' : 'Toggle active'}
                        >
                          <span className="admin-usr-toggle__dot" />
                          {u.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="admin-usr-pager">
              <div className="admin-usr-pager__left">
                <span className="admin-usr-pager__label">Rows</span>
                <select
                  className="admin-usr-input admin-usr-input--select admin-usr-pager__select"
                  value={userPageSize}
                  onChange={(e) => {
                    setUserPageSize(Number(e.target.value))
                    setUserPage(0)
                  }}
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-usr-pager__right">
                <button
                  type="button"
                  className="admin-usr-page-btn"
                  disabled={safeUserPage <= 0}
                  onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                >
                  <i className="bi bi-chevron-left" />
                  Prev
                </button>
                <span className="admin-usr-pager__info">
                  Page <strong>{safeUserPage + 1}</strong> / {userTotalPages}
                  <span className="admin-usr-pager__dot">·</span>
                  {filteredCount} users
                </span>
                <button
                  type="button"
                  className="admin-usr-page-btn"
                  disabled={safeUserPage >= userTotalPages - 1}
                  onClick={() => setUserPage((p) => p + 1)}
                >
                  Next
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </div>
  )
}

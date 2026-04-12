import React, { useMemo } from 'react'

export default function AdminDepartments({
  stats,
  departments,
  deptUserCounts,
  newDeptName,
  setNewDeptName,
  onCreateDepartment,
  busy
}) {
  const nDept = departments.length
  const headSum = useMemo(() => {
    let s = 0
    for (const d of departments) s += deptUserCounts.get(d.id) || 0
    return s
  }, [departments, deptUserCounts])

  const maxHead = useMemo(() => {
    let m = 1
    for (const d of departments) m = Math.max(m, deptUserCounts.get(d.id) || 0)
    return m
  }, [departments, deptUserCounts])

  const avg = nDept > 0 ? (headSum / nDept).toFixed(1) : '0'

  return (
    <div className="admin-dept">
      <section className="admin-dept-hero" aria-labelledby="admin-dept-title">
        <div className="admin-dept-hero__glow" aria-hidden />
        <div className="admin-dept-hero__inner">
          <div className="admin-dept-hero__brand">
            <div className="admin-dept-hero__orb" aria-hidden>
              <i className="bi bi-diagram-3-fill" />
            </div>
            <div>
              <p className="admin-dept-eyebrow">Organization</p>
              <h1 id="admin-dept-title" className="admin-dept-title">
                Departments
              </h1>
              <p className="admin-dept-lead">
                Structure your workforce into units for reporting, access scoping, and headcount visibility across AI-CSGTS.
              </p>
              <div className="admin-dept-stat-strip">
                <span className="admin-dept-pill">
                  <i className="bi bi-building" />
                  <strong>{nDept}</strong> units
                </span>
                <span className="admin-dept-pill admin-dept-pill--people">
                  <i className="bi bi-people-fill" />
                  <strong>{headSum}</strong> assigned
                </span>
                <span className="admin-dept-pill admin-dept-pill--avg">
                  <i className="bi bi-bar-chart-line" />
                  <strong>{avg}</strong> avg / unit
                </span>
                {stats?.totalUsers != null && (
                  <span className="admin-dept-pill admin-dept-pill--tenant">
                    <i className="bi bi-globe2" />
                    <strong>{stats.totalUsers}</strong> tenant users
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-dept-create">
        <div className="admin-dept-create__icon" aria-hidden>
          <i className="bi bi-plus-lg" />
        </div>
        <div className="admin-dept-create__body">
          <h2 className="admin-dept-create__title">Add department</h2>
          <p className="admin-dept-create__sub">Creates a new org unit for user assignment and analytics.</p>
        </div>
        <form className="admin-dept-create__form" onSubmit={onCreateDepartment}>
          <label className="visually-hidden" htmlFor="admin-dept-name-input">
            Department name
          </label>
          <input
            id="admin-dept-name-input"
            className="admin-dept-input"
            placeholder="e.g. Engineering, Sales, Operations"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            disabled={busy}
          />
          <button className="admin-dept-submit" type="submit" disabled={busy}>
            <i className="bi bi-check2" />
            Create
          </button>
        </form>
      </div>

      <section className="admin-dept-grid-section" aria-labelledby="admin-dept-grid-title">
        <div className="admin-dept-grid-head">
          <h2 id="admin-dept-grid-title" className="admin-dept-grid-title">
            <i className="bi bi-grid-1x2-fill" aria-hidden />
            All departments
          </h2>
          <p className="admin-dept-grid-lead">Headcount reflects users currently mapped to each unit.</p>
        </div>

        {nDept === 0 ? (
          <div className="admin-dept-empty">
            <div className="admin-dept-empty__icon">
              <i className="bi bi-inbox" />
            </div>
            <p className="admin-dept-empty__title">No departments yet</p>
            <p className="admin-dept-empty__text">Create your first unit above to start assigning people.</p>
          </div>
        ) : (
          <ul className="admin-dept-grid">
            {departments.map((d, index) => {
              const head = deptUserCounts.get(d.id) || 0
              const pct = Math.round((head / maxHead) * 100)
              const hue = index % 4
              return (
                <li key={d.id}>
                  <article className={`admin-dept-card admin-dept-card--tone-${hue}`}>
                    <div className="admin-dept-card__top">
                      <span className="admin-dept-card__badge">ID {d.id}</span>
                      <span className="admin-dept-card__count">
                        <i className="bi bi-person-fill" aria-hidden />
                        {head}
                      </span>
                    </div>
                    <h3 className="admin-dept-card__name">{d.name}</h3>
                    <div className="admin-dept-card__bar" aria-hidden>
                      <div className="admin-dept-card__bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="admin-dept-card__foot">
                      {head === 0 ? 'No users assigned' : `${head} user${head === 1 ? '' : 's'} in this unit`}
                    </p>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

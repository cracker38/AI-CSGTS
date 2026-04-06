import React from 'react'

/** Bootstrap alerts — works inside AdminLTE `container-fluid` */
export function RoleAlerts({ error, success }) {
  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}
    </>
  )
}

export function RoleLoading({ children = 'Loading…' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-body-secondary">
      <div className="spinner-border text-primary mb-3" role="status">
        <span className="visually-hidden">Loading</span>
      </div>
      {children}
    </div>
  )
}

/** Colored KPI using AdminLTE `small-box` when icons available */
export function SmallBoxKpi({ value, label, variant = 'primary', iconClass = 'bi-circle' }) {
  const bg = {
    primary: 'text-bg-primary',
    success: 'text-bg-success',
    warning: 'text-bg-warning',
    danger: 'text-bg-danger',
    info: 'text-bg-info',
    secondary: 'text-bg-secondary'
  }[variant] || 'text-bg-primary'

  return (
    <div className={`small-box ${bg}`}>
      <div className="inner">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
      <i className={`bi ${iconClass} small-box-icon`} aria-hidden />
    </div>
  )
}

export function RoleCard({ title, iconClass = 'bi-grid', children, className = '', headerRight = null, id = undefined }) {
  return (
    <div
      className={`card shadow-sm ${className}`}
      id={id}
      style={id ? { scrollMarginTop: '5rem' } : undefined}
    >
      <div className="card-header d-flex flex-wrap align-items-center gap-2 border-0">
        <h3 className="card-title mb-0 flex-grow-1 text-truncate">
          {iconClass && <i className={`bi ${iconClass} me-2`} aria-hidden />}
          {title}
        </h3>
        {headerRight}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

export function RoleTable({ children }) {
  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover align-middle mb-0">{children}</table>
    </div>
  )
}

import React, { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { api } from '../../api.js'
import { BRAND_TITLE } from '../../content/branding.js'
import { useTheme } from '../../context/ThemeContext.jsx'
import { ADMIN_TAB_ITEMS, adminTabLabel, parseAdminTab } from '../../pages/admin/adminNavConfig.js'
import {
  EMPLOYEE_SIDEBAR_ITEMS,
  HR_SIDEBAR_ITEMS,
  MANAGER_SIDEBAR_ITEMS,
  hrTabLabel,
  parseHrTab
} from '../../pages/dashboard/dashboardNavConfig.js'

function activityLinkTo(item) {
  if (item.hash) return `${item.path}#${item.hash}`
  return item.path
}

import '@fontsource/source-sans-3/index.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'admin-lte/dist/css/adminlte.min.css'

const NAV_BY_ROLE = {
  EMPLOYEE: { to: '/employee', label: 'Workspace', icon: 'bi-speedometer2' },
  MANAGER: { to: '/manager', label: 'Team command', icon: 'bi-people-fill' },
  HR: { to: '/hr', label: 'HR hub', icon: 'bi-briefcase-fill' },
  EXECUTIVE: { to: '/executive', label: 'Executive', icon: 'bi-graph-up' },
  ADMIN: { to: '/admin', label: 'Administration', icon: 'bi-shield-fill-check' }
}

const PAGE_TITLE = {
  '/employee': 'Workspace',
  '/manager': 'Team command',
  '/hr': 'HR hub',
  '/executive': 'Executive',
  '/admin': 'Administration'
}

const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  HR: 'HR',
  EXECUTIVE: 'Executive',
  ADMIN: 'Administrator'
}

function hashSidebarLinkActive(path, itemHash, currentHash) {
  const h = (currentHash || '').replace(/^#/, '')
  if (!itemHash) return path && (h === '' || h === undefined)
  return h === itemHash
}

export default function DashboardLayout({ me, onLogout, children }) {
  const { pathname, search, hash } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const nav = NAV_BY_ROLE[me?.role] || NAV_BY_ROLE.EMPLOYEE
  const adminTab = me?.role === 'ADMIN' && pathname === '/admin' ? parseAdminTab(search) : null
  const hrTab = me?.role === 'HR' && pathname === '/hr' ? parseHrTab(search) : null
  const title = PAGE_TITLE[pathname] || 'Dashboard'
  const pageTitle =
    adminTab != null
      ? `${PAGE_TITLE['/admin']} — ${adminTabLabel(adminTab)}`
      : hrTab != null
        ? `${PAGE_TITLE['/hr']} — ${hrTabLabel(hrTab)}`
        : title
  const initial = (me?.name || 'U').trim().charAt(0).toUpperCase()
  const roleLabel = (me?.role && ROLE_LABELS[me.role]) || (me?.role ? me.role.charAt(0) + me.role.slice(1).toLowerCase() : '')

  const [activity, setActivity] = useState({ badgeCount: 0, items: [] })

  const loadActivitySummary = useCallback(async () => {
    if (!me) return
    try {
      const { data } = await api.get('/api/activity/summary')
      setActivity({
        badgeCount: typeof data.badgeCount === 'number' ? data.badgeCount : 0,
        items: Array.isArray(data.items) ? data.items : []
      })
    } catch {
      setActivity({ badgeCount: 0, items: [] })
    }
  }, [me])

  useEffect(() => {
    if (!me) return
    loadActivitySummary()
    const id = setInterval(loadActivitySummary, 120_000)
    return () => clearInterval(id)
  }, [me, loadActivitySummary])

  useEffect(() => {
    document.body.classList.add('layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary')
    return () => {
      document.body.classList.remove('layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary')
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await import('bootstrap/dist/js/bootstrap.bundle.min.js')
      if (!alive) return
      await import('admin-lte/dist/js/adminlte.min.js')
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="app-wrapper">
      <nav className="app-header navbar navbar-expand bg-body border-bottom">
        <div className="container-fluid">
          <ul className="navbar-nav">
            <li className="nav-item">
              <button type="button" className="nav-link bg-transparent border-0 px-3" data-lte-toggle="sidebar">
                <i className="bi bi-list" />
              </button>
            </li>
            <li className="nav-item d-none d-md-block">
              <NavLink to={nav.to} className="nav-link" end>
                Home
              </NavLink>
            </li>
          </ul>
          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item d-none d-sm-block">
              <span className="nav-link text-body-secondary small py-0">{me?.email}</span>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className="nav-link bg-transparent border-0"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                <i className={theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill'} />
              </button>
            </li>
            <li className="nav-item dropdown">
              <button
                type="button"
                className="nav-link bg-transparent border-0 position-relative"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="Activity summary"
              >
                <i className="bi bi-bell-fill" />
                {activity.badgeCount > 0 ? (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-warning px-2">
                    {activity.badgeCount > 99 ? '99+' : activity.badgeCount}
                  </span>
                ) : null}
              </button>
              <div className="dropdown-menu dropdown-menu-lg dropdown-menu-end shadow">
                <span className="dropdown-item dropdown-header">Activity summary</span>
                <div className="dropdown-divider" />
                {activity.items.length === 0 ? (
                  <span className="dropdown-item text-body-secondary small">Nothing to show</span>
                ) : (
                  activity.items.map((it, idx) => (
                    <Link key={idx} className="dropdown-item small" to={activityLinkTo(it)}>
                      {it.text}
                    </Link>
                  ))
                )}
                <div className="dropdown-divider" />
                <button type="button" className="dropdown-item small text-primary" onClick={() => loadActivitySummary()}>
                  <i className="bi bi-arrow-clockwise me-1" />
                  Refresh
                </button>
              </div>
            </li>
            <li className="nav-item">
              <button type="button" className="nav-link bg-transparent border-0" data-lte-toggle="fullscreen">
                <i data-lte-icon="maximize" className="bi bi-arrows-fullscreen" />
                <i data-lte-icon="minimize" className="bi bi-fullscreen-exit" style={{ display: 'none' }} />
              </button>
            </li>
            <li className="nav-item dropdown user-menu">
              <button
                type="button"
                className="nav-link dropdown-toggle bg-transparent border-0 d-flex align-items-center gap-2"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span
                  className="user-image d-inline-flex align-items-center justify-content-center rounded-circle shadow text-white fw-bold"
                  style={{
                    width: '2rem',
                    height: '2rem',
                    fontSize: '0.85rem',
                    background: 'linear-gradient(135deg, #0d6efd, #6610f2)'
                  }}
                >
                  {initial}
                </span>
                <span className="d-none d-md-inline text-truncate" style={{ maxWidth: '10rem' }}>
                  {me?.name}
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-lg dropdown-menu-end">
                <li className="user-header text-bg-primary">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle shadow text-white fw-bold mb-2"
                    style={{
                      width: '3.5rem',
                      height: '3.5rem',
                      fontSize: '1.25rem',
                      background: 'rgba(255,255,255,0.2)'
                    }}
                  >
                    {initial}
                  </span>
                  <p className="mb-0">
                    {me?.name}
                    <small className="d-block opacity-75">
                      {roleLabel} · {me?.email}
                    </small>
                  </p>
                </li>
                <li className="user-footer d-flex gap-2 p-2">
                  <button type="button" className="btn btn-outline-danger btn-sm ms-auto" onClick={onLogout}>
                    Sign out
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>

      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        <div className="sidebar-brand">
          <NavLink to={nav.to} className="brand-link" end>
            <span
              className="brand-image d-inline-flex align-items-center justify-content-center rounded-1 fw-bold text-white opacity-75 shadow"
              style={{
                width: '2rem',
                height: '2rem',
                fontSize: '0.75rem',
                background: 'linear-gradient(135deg, #0d6efd, #6f42c1)'
              }}
            >
              AI
            </span>
            <span className="brand-text fw-light ms-2">{BRAND_TITLE}</span>
          </NavLink>
        </div>
        <div className="sidebar-wrapper">
          <nav className="mt-2">
            <ul
              className="nav sidebar-menu flex-column"
              data-lte-toggle="treeview"
              role="navigation"
              aria-label="Main navigation"
              data-accordion="false"
            >
              <li className="nav-item menu-open">
                <a href="#" className="nav-link active" onClick={(e) => e.preventDefault()}>
                  <i className={`nav-icon bi ${nav.icon}`} />
                  <p>
                    Dashboard
                    <i className="nav-arrow bi bi-chevron-right" />
                  </p>
                </a>
                <ul className="nav nav-treeview">
                  {me?.role === 'ADMIN' &&
                    ADMIN_TAB_ITEMS.map((item) => (
                      <li className="nav-item" key={item.id}>
                        <Link
                          to={`/admin?tab=${item.id}`}
                          className={`nav-link d-flex align-items-center ${adminTab === item.id ? 'active' : ''}`}
                        >
                          <i className={`nav-icon bi ${item.icon}`} />
                          <p className="mb-0">{item.label}</p>
                        </Link>
                      </li>
                    ))}
                  {me?.role === 'HR' &&
                    HR_SIDEBAR_ITEMS.map((item) => (
                      <li className="nav-item" key={item.id}>
                        <Link
                          to={item.id === 'overview' ? '/hr' : `/hr?tab=${item.id}`}
                          className={`nav-link d-flex align-items-center ${hrTab === item.id ? 'active' : ''}`}
                        >
                          <i className={`nav-icon bi ${item.icon}`} />
                          <p className="mb-0">{item.label}</p>
                        </Link>
                      </li>
                    ))}
                  {me?.role === 'EMPLOYEE' &&
                    EMPLOYEE_SIDEBAR_ITEMS.map((item) => (
                      <li className="nav-item" key={item.id}>
                        {item.hash === '' ? (
                          <NavLink
                            to="/employee"
                            className={({ isActive }) => `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
                            isActive={(_, loc) =>
                              loc.pathname === '/employee' && !(loc.hash && loc.hash.length > 1)
                            }
                          >
                            <i className={`nav-icon bi ${item.icon}`} />
                            <p className="mb-0">{item.label}</p>
                          </NavLink>
                        ) : (
                          <Link
                            to={`/employee#${item.hash}`}
                            className={`nav-link d-flex align-items-center ${
                              hashSidebarLinkActive(true, item.hash, hash) ? 'active' : ''
                            }`}
                          >
                            <i className={`nav-icon bi ${item.icon}`} />
                            <p className="mb-0">{item.label}</p>
                          </Link>
                        )}
                      </li>
                    ))}
                  {me?.role === 'MANAGER' &&
                    MANAGER_SIDEBAR_ITEMS.map((item) => (
                      <li className="nav-item" key={item.id}>
                        {item.hash === '' ? (
                          <NavLink
                            to="/manager"
                            className={({ isActive }) => `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
                            isActive={(_, loc) =>
                              loc.pathname === '/manager' && !(loc.hash && loc.hash.length > 1)
                            }
                          >
                            <i className={`nav-icon bi ${item.icon}`} />
                            <p className="mb-0">{item.label}</p>
                          </NavLink>
                        ) : (
                          <Link
                            to={`/manager#${item.hash}`}
                            className={`nav-link d-flex align-items-center ${
                              hashSidebarLinkActive(true, item.hash, hash) ? 'active' : ''
                            }`}
                          >
                            <i className={`nav-icon bi ${item.icon}`} />
                            <p className="mb-0">{item.label}</p>
                          </Link>
                        )}
                      </li>
                    ))}
                  {me?.role === 'EXECUTIVE' && (
                    <li className="nav-item">
                      <NavLink
                        to="/executive"
                        end
                        className={({ isActive }) => `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
                      >
                        <i className="nav-icon bi bi-graph-up" />
                        <p className="mb-0">Overview</p>
                      </NavLink>
                    </li>
                  )}
                  {me?.role && !['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER', 'EXECUTIVE'].includes(me.role) && (
                    <li className="nav-item">
                      <NavLink to={nav.to} end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <i className="nav-icon bi bi-circle" />
                        <p>{nav.label}</p>
                      </NavLink>
                    </li>
                  )}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-content-header">
          <div className="container-fluid">
            <div className="row">
              <div className="col-sm-6">
                <h3 className="mb-0">{pageTitle}</h3>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-end">
                  <li className="breadcrumb-item">
                    <NavLink to={nav.to} className="text-decoration-none">
                      {BRAND_TITLE}
                    </NavLink>
                  </li>
                  {adminTab != null ? (
                    <>
                      <li className="breadcrumb-item">
                        <Link to="/admin" className="text-decoration-none">
                          {PAGE_TITLE['/admin']}
                        </Link>
                      </li>
                      <li className="breadcrumb-item active" aria-current="page">
                        {adminTabLabel(adminTab)}
                      </li>
                    </>
                  ) : hrTab != null && hrTab !== 'overview' ? (
                    <>
                      <li className="breadcrumb-item">
                        <Link to="/hr" className="text-decoration-none">
                          {PAGE_TITLE['/hr']}
                        </Link>
                      </li>
                      <li className="breadcrumb-item active" aria-current="page">
                        {hrTabLabel(hrTab)}
                      </li>
                    </>
                  ) : (
                    <li className="breadcrumb-item active" aria-current="page">
                      {title}
                    </li>
                  )}
                </ol>
              </div>
            </div>
          </div>
        </div>
        <div className="app-content">
          <div className="container-fluid">{children}</div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="float-end d-none d-sm-inline text-body-secondary small">AI competency &amp; skill tracking</div>
        <strong>
          {BRAND_TITLE} &copy; {new Date().getFullYear()}
        </strong>
        <span className="ms-1">· AdminLTE 4 layout</span>
      </footer>
    </div>
  )
}

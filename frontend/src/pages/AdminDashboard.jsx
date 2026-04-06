import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import {
  auditToCsv,
  debounce,
  downloadTextFile,
  formatInstant,
  usersToCsv
} from './admin/adminHelpers.js'
import { parseAdminTab } from './admin/adminNavConfig.js'
import { RoleAlerts, RoleCard, RoleLoading, RoleTable, SmallBoxKpi } from './dashboard/dashboardRoleUi.jsx'

const ADMIN_CREATE_ROLES = ['MANAGER', 'HR', 'ADMIN']
const ALL_ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN']

function permissionGroup(code) {
  if (!code) return 'Other'
  if (code.startsWith('ADMIN_')) return 'Administration'
  if (code.startsWith('HR_')) return 'HR'
  if (code.startsWith('MANAGER_') || code.startsWith('MGR_')) return 'Manager'
  return 'Other'
}

export default function AdminDashboard() {
  const [searchParams] = useSearchParams()
  const tab = parseAdminTab(searchParams)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [config, setConfig] = useState(null)
  const [auditRecent, setAuditRecent] = useState([])
  const [stats, setStats] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [permRole, setPermRole] = useState('ADMIN')
  const [rolePerms, setRolePerms] = useState(null)
  const [permSearch, setPermSearch] = useState('')
  const [permSelection, setPermSelection] = useState(() => new Set())
  const [jobRoles, setJobRoles] = useState([])

  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [me, setMe] = useState(null)

  const [gapRank, setGapRank] = useState(2)
  const [cuName, setCuName] = useState('')
  const [cuEmail, setCuEmail] = useState('')
  const [cuPass, setCuPass] = useState('')
  const [cuRole, setCuRole] = useState('MANAGER')
  const [cuDept, setCuDept] = useState('')
  const [cuJobRole, setCuJobRole] = useState('')

  const [newDeptName, setNewDeptName] = useState('')
  const [newPermCode, setNewPermCode] = useState('')
  const [newPermDesc, setNewPermDesc] = useState('')

  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userDeptFilter, setUserDeptFilter] = useState('')
  const [userActiveFilter, setUserActiveFilter] = useState('all')
  const [userSort, setUserSort] = useState({ key: 'name', dir: 'asc' })
  const [userPage, setUserPage] = useState(0)
  const [userPageSize, setUserPageSize] = useState(10)

  const [auditQ, setAuditQ] = useState('')
  const [auditDebouncedQ, setAuditDebouncedQ] = useState('')
  const [auditPage, setAuditPage] = useState(0)
  const [auditPageData, setAuditPageData] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  const deptById = useMemo(() => {
    const m = new Map()
    for (const d of departments) m.set(d.id, d.name)
    return m
  }, [departments])

  const jobRoleById = useMemo(() => {
    const m = new Map()
    for (const r of jobRoles) m.set(r.id, r.name)
    return m
  }, [jobRoles])

  const loadCore = useCallback(async () => {
    setError('')
    try {
      setLoading(true)
      const [u, d, c, a, reg] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/departments'),
        api.get('/api/admin/config'),
        api.get('/api/admin/audit/recent'),
        api.get('/api/public/registration-options')
      ])
      setUsers(u.data)
      setDepartments(d.data)
      setConfig(c.data)
      setAuditRecent(a.data)
      setJobRoles(reg.data?.jobRoles || [])
      if (c.data?.gapAlertRank != null) setGapRank(c.data.gapAlertRank)
      if (d.data.length) {
        setCuDept((prev) => prev || String(d.data[0].id))
      }

      try {
        const s = await api.get('/api/admin/stats')
        setStats(s.data)
      } catch {
        const list = u.data || []
        const byRole = {}
        for (const r of ALL_ROLES) byRole[r] = 0
        for (const row of list) {
          if (row.role) byRole[row.role] = (byRole[row.role] || 0) + 1
        }
        setStats({
          totalUsers: list.length,
          activeUsers: list.filter((x) => x.active).length,
          inactiveUsers: list.filter((x) => !x.active).length,
          usersByRole: byRole,
          departmentCount: d.data.length,
          permissionCount: 0,
          auditEventsLast24h: 0
        })
      }
    } catch (e) {
      if (e?.response?.status === 401) {
        setError('Session expired. Redirecting to login…')
      } else {
        setError(e?.response?.data?.error || 'FAILED_TO_LOAD_ADMIN_DASHBOARD')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCore()
  }, [loadCore])

  useEffect(() => {
    api.get('/api/auth/me').then((r) => setMe(r.data)).catch(() => {})
  }, [])

  const debouncedAudit = useMemo(
    () =>
      debounce((q) => {
        setAuditDebouncedQ(q)
        setAuditPage(0)
      }, 320),
    []
  )

  useEffect(() => {
    debouncedAudit(auditQ)
  }, [auditQ, debouncedAudit])

  const loadAuditPage = useCallback(async () => {
    setAuditLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        page: String(auditPage),
        size: '20',
        ...(auditDebouncedQ.trim() ? { q: auditDebouncedQ.trim() } : {})
      })
      const res = await api.get(`/api/admin/audit?${params}`)
      setAuditPageData(res.data)
    } catch (e) {
      setError(e?.response?.data?.error || 'FAILED_TO_LOAD_AUDIT')
      setAuditPageData(null)
    } finally {
      setAuditLoading(false)
    }
  }, [auditPage, auditDebouncedQ])

  useEffect(() => {
    if (tab !== 'audit') return
    loadAuditPage()
  }, [tab, loadAuditPage])

  const loadPermissionsForRole = useCallback(async (role) => {
    setError('')
    setRolePerms(null)
    try {
      const [perms, rp] = await Promise.all([
        api.get('/api/admin/permissions'),
        api.get(`/api/admin/role-permissions/${role}`)
      ])
      setPermissions(perms.data)
      setRolePerms(rp.data)
      setPermSelection(new Set(rp.data?.permissionCodes || []))
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not load permissions.')
    }
  }, [])

  useEffect(() => {
    if (tab !== 'permissions') return
    loadPermissionsForRole(permRole)
  }, [tab, permRole, loadPermissionsForRole])

  async function saveConfig(e) {
    e.preventDefault()
    const rank = Number(gapRank)
    if (Number.isNaN(rank) || rank < 0 || rank > 10) {
      setError('Gap alert rank must be between 0 and 10.')
      return
    }
    setBusy(true)
    setMsg('')
    setError('')
    try {
      await api.patch('/api/admin/config', { gapAlertRank: rank })
      const c = await api.get('/api/admin/config')
      setConfig(c.data)
      setMsg('Configuration saved.')
    } catch (e) {
      setError(e?.response?.data?.error || 'SAVE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function createUser(e) {
    e.preventDefault()
    if (!cuDept) return
    setBusy(true)
    setMsg('')
    setError('')
    try {
      await api.post('/api/admin/users', {
        name: cuName.trim(),
        email: cuEmail.trim().toLowerCase(),
        password: cuPass,
        role: cuRole,
        departmentId: Number(cuDept),
        jobRoleId: cuJobRole === '' ? null : Number(cuJobRole)
      })
      setCuName('')
      setCuEmail('')
      setCuPass('')
      await loadCore()
      setMsg('User created successfully.')
    } catch (e) {
      setError(e?.response?.data?.error || 'CREATE_USER_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function toggleUserActive(u) {
    if (me && u.id === me.id) {
      setError('You cannot change your own active status from this panel.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.patch(`/api/admin/users/${u.id}/activate`, { active: !u.active })
      await loadCore()
      setMsg(`User ${u.active ? 'deactivated' : 'activated'}.`)
    } catch (e) {
      setError(e?.response?.data?.error || 'UPDATE_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function createDepartment(e) {
    e.preventDefault()
    const name = newDeptName.trim()
    if (!name) return
    setBusy(true)
    setError('')
    setMsg('')
    try {
      await api.post('/api/admin/departments', { name })
      setNewDeptName('')
      await loadCore()
      setMsg('Department created.')
    } catch (e) {
      setError(e?.response?.data?.error || 'CREATE_DEPARTMENT_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function importUsersCsv(ev) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/api/admin/users/import', fd)
      await loadCore()
      setMsg(`Import finished: ${res.data?.imported ?? 0} user(s) created.`)
    } catch (e) {
      setError(e?.response?.data?.error || 'IMPORT_FAILED')
    } finally {
      setBusy(false)
    }
  }

  function exportUsersCsv() {
    downloadTextFile(
      `users-export-${new Date().toISOString().slice(0, 10)}.csv`,
      usersToCsv(filteredUsersForExport)
    )
    setMsg('CSV download started (filtered list).')
  }

  function exportAuditCsv() {
    const rows = auditPageData?.content || []
    downloadTextFile(
      `audit-page-${auditPage + 1}-${new Date().toISOString().slice(0, 10)}.csv`,
      auditToCsv(rows)
    )
  }

  const filteredUsers = useMemo(() => {
    let list = [...users]
    const q = userSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      )
    }
    if (userRoleFilter) list = list.filter((u) => u.role === userRoleFilter)
    if (userDeptFilter) list = list.filter((u) => String(u.departmentId) === userDeptFilter)
    if (userActiveFilter === 'active') list = list.filter((u) => u.active)
    if (userActiveFilter === 'inactive') list = list.filter((u) => !u.active)

    const { key, dir } = userSort
    list.sort((a, b) => {
      const va = a[key] ?? ''
      const vb = b[key] ?? ''
      const c = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' })
      return dir === 'asc' ? c : -c
    })
    return list
  }, [users, userSearch, userRoleFilter, userDeptFilter, userActiveFilter, userSort])

  const filteredUsersForExport = filteredUsers

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize))
  const safeUserPage = Math.min(userPage, userTotalPages - 1)
  const pagedUsers = useMemo(() => {
    const start = safeUserPage * userPageSize
    return filteredUsers.slice(start, start + userPageSize)
  }, [filteredUsers, safeUserPage, userPageSize])

  useEffect(() => {
    if (userPage > 0 && safeUserPage < userPage) setUserPage(safeUserPage)
  }, [safeUserPage, userPage])

  const deptUserCounts = useMemo(() => {
    const counts = new Map()
    for (const u of users) {
      const id = u.departmentId
      if (id == null) continue
      counts.set(id, (counts.get(id) || 0) + 1)
    }
    return counts
  }, [users])

  const roleBars = useMemo(() => {
    const src = stats?.usersByRole || {}
    const entries = ALL_ROLES.map((r) => [r, Number(src[r] || 0)])
    const max = Math.max(1, ...entries.map(([, n]) => n))
    return entries.map(([role, n]) => ({ role, n, pct: Math.round((n / max) * 100) }))
  }, [stats])

  const deptBars = useMemo(() => {
    const rows = departments.map((d) => ({
      id: d.id,
      name: d.name,
      n: deptUserCounts.get(d.id) || 0
    }))
    const max = Math.max(1, ...rows.map((r) => r.n))
    return rows.map((r) => ({ ...r, pct: Math.round((r.n / max) * 100) }))
  }, [departments, deptUserCounts])

  const groupedPermissions = useMemo(() => {
    const q = permSearch.trim().toLowerCase()
    let list = permissions
    if (q) list = list.filter((p) => p.code.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
    const groups = new Map()
    for (const p of list) {
      const g = permissionGroup(p.code)
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g).push(p)
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.code.localeCompare(b.code))
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [permissions, permSearch])

  function togglePermCode(code, checked) {
    setPermSelection((prev) => {
      const next = new Set(prev)
      if (checked) next.add(code)
      else next.delete(code)
      return next
    })
  }

  async function saveRolePermissions() {
    const codes = [...permSelection]
    if (permRole === 'ADMIN' && codes.length < 2) {
      if (!window.confirm('Saving a minimal permission set for ADMIN may lock administrative access. Continue?')) return
    }
    setBusy(true)
    setError('')
    setMsg('')
    try {
      await api.post(`/api/admin/role-permissions/${permRole}`, { permissionCodes: codes })
      await loadPermissionsForRole(permRole)
      setMsg(`Permissions updated for ${permRole}.`)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'SAVE_PERMISSIONS_FAILED')
    } finally {
      setBusy(false)
    }
  }

  async function createPermission(e) {
    e.preventDefault()
    const code = newPermCode.trim().toUpperCase().replace(/\s+/g, '_')
    if (!code) return
    setBusy(true)
    setError('')
    setMsg('')
    try {
      const res = await api.post('/api/admin/permissions', {
        code,
        description: newPermDesc.trim() || null
      })
      if (res.data?.status === 'ALREADY_EXISTS') setMsg('Permission code already exists.')
      else {
        setNewPermCode('')
        setNewPermDesc('')
        setMsg('Permission created.')
        await loadPermissionsForRole(permRole)
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'CREATE_PERMISSION_FAILED')
    } finally {
      setBusy(false)
    }
  }

  function sortHeader(key) {
    setUserSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
    setUserPage(0)
  }

  return (
    <>
      <div className="card bg-warning bg-gradient text-dark mb-3 shadow-sm">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap align-items-center gap-3">
            <span className="rounded-2 bg-dark bg-opacity-10 px-3 py-2 fw-bold">A</span>
            <div className="flex-grow-1">
              <h2 className="h5 mb-1">Administration</h2>
              <p className="mb-0 small opacity-75">
                Directory, RBAC, configuration, audit trail, and bulk import/export — centralized control plane.
              </p>
              <div className="d-flex flex-wrap gap-1 mt-2">
                <span className="badge text-bg-dark bg-opacity-25">RBAC</span>
                <span className="badge text-bg-dark bg-opacity-25">Audit-ready</span>
                <span className="badge text-bg-dark bg-opacity-25">Import / Export</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-dark btn-sm align-self-start"
              onClick={() => loadCore()}
              disabled={loading || busy}
              title="Reload users, departments, stats, and configuration"
            >
              <i className="bi bi-arrow-clockwise me-1" />
              Refresh data
            </button>
          </div>
        </div>
      </div>

      <RoleAlerts error={error} success={msg} />

      {loading ? (
        <RoleLoading>Loading administration…</RoleLoading>
      ) : (
        <>
          {tab === 'overview' && stats && (
            <div className="mb-4">
              <div className="row g-3 mb-3">
                <div className="col-sm-6 col-xl-3">
                  <SmallBoxKpi value={stats.totalUsers} label="Total users" variant="primary" iconClass="bi-people" />
                </div>
                <div className="col-sm-6 col-xl-3">
                  <SmallBoxKpi value={stats.activeUsers} label="Active accounts" variant="success" iconClass="bi-person-check" />
                </div>
                <div className="col-sm-6 col-xl-3">
                  <SmallBoxKpi value={stats.departmentCount} label="Departments" variant="info" iconClass="bi-building" />
                </div>
                <div className="col-sm-6 col-xl-3">
                  <SmallBoxKpi
                    value={stats.auditEventsLast24h}
                    label="Audit (24h)"
                    variant="warning"
                    iconClass="bi-clock-history"
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-lg-6">
                  <RoleCard title="Users by role" iconClass="bi-pie-chart">
                    <ul className="list-unstyled mb-0">
                      {roleBars.map(({ role, n, pct }) => (
                        <li key={role} className="d-flex align-items-center gap-2 mb-3 small">
                          <span className="text-nowrap fw-semibold" style={{ width: '6.5rem' }}>
                            {role}
                          </span>
                          <div className="progress flex-grow-1" style={{ height: '0.5rem' }}>
                            <div
                              className="progress-bar bg-primary"
                              role="progressbar"
                              style={{ width: `${pct}%` }}
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                          <span className="text-end font-monospace text-body-secondary" style={{ width: '2rem' }}>
                            {n}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </RoleCard>
                </div>
                <div className="col-lg-6">
                  <RoleCard title="Headcount by department" iconClass="bi-building">
                    <ul className="list-unstyled mb-0">
                      {deptBars.map(({ id, name, n, pct }) => (
                        <li key={id} className="d-flex align-items-center gap-2 mb-3 small">
                          <span className="text-truncate fw-semibold" style={{ maxWidth: '8rem' }}>
                            {name}
                          </span>
                          <div className="progress flex-grow-1" style={{ height: '0.5rem' }}>
                            <div
                              className="progress-bar bg-info"
                              role="progressbar"
                              style={{ width: `${pct}%` }}
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                          <span className="text-end font-monospace text-body-secondary" style={{ width: '2rem' }}>
                            {n}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </RoleCard>
                </div>
              </div>

              <RoleCard title="Recent activity" iconClass="bi-lightning-charge">
                <div className="d-flex flex-column gap-2">
                  {(auditRecent || []).slice(0, 8).map((row) => (
                    <div
                      key={row.id ?? `${row.createdAt}-${row.action}`}
                      className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 rounded border bg-body-secondary bg-opacity-25 px-3 py-2 small"
                    >
                      <span className="font-monospace text-body-secondary">{formatInstant(row.createdAt)}</span>
                      <span className="fw-bold text-primary">{row.action}</span>
                      <span className="text-body-secondary">{row.actor?.email || '—'}</span>
                    </div>
                  ))}
                  {!auditRecent?.length && <p className="text-body-secondary mb-0">No audit events recorded yet.</p>}
                </div>
              </RoleCard>
            </div>
          )}

          {tab === 'users' && (
            <div className="row g-3">
              <div className="col-xl-4">
                <RoleCard title="Create user" iconClass="bi-person-plus">
                  <form onSubmit={createUser} className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label small mb-1">Full name</label>
                      <input className="form-control form-control-sm" value={cuName} onChange={(e) => setCuName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="form-label small mb-1">Email</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        value={cuEmail}
                        onChange={(e) => setCuEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label small mb-1">Temporary password</label>
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        value={cuPass}
                        onChange={(e) => setCuPass(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    <div>
                      <label className="form-label small mb-1">Role</label>
                      <select className="form-select form-select-sm" value={cuRole} onChange={(e) => setCuRole(e.target.value)}>
                        {ADMIN_CREATE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label small mb-1">Department</label>
                      <select className="form-select form-select-sm" value={cuDept} onChange={(e) => setCuDept(e.target.value)} required>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label small mb-1">Job role (optional)</label>
                      <select className="form-select form-select-sm" value={cuJobRole} onChange={(e) => setCuJobRole(e.target.value)}>
                        <option value="">— None —</option>
                        {jobRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-primary w-100" type="submit" disabled={busy}>
                      Create user
                    </button>
                  </form>
                  <p className="mt-3 mb-0 small text-body-secondary">
                    Employees must self-register. CSV columns:{' '}
                    <code className="px-1 rounded bg-body-secondary">name,email,password,role,departmentId,jobRoleId</code>
                  </p>
                </RoleCard>
              </div>

              <div className="col-xl-8">
                <RoleCard
                  title="Directory"
                  iconClass="bi-people"
                  headerRight={
                    <div className="d-flex flex-wrap gap-2">
                      <label className="btn btn-sm btn-outline-secondary mb-0">
                        <input type="file" accept=".csv,text/csv" className="d-none" onChange={importUsersCsv} disabled={busy} />
                        Import CSV
                      </label>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={exportUsersCsv}
                        disabled={!filteredUsers.length}
                      >
                        Export CSV
                      </button>
                    </div>
                  }
                >
                  <div className="row g-2 mb-3">
                    <div className="col-sm-6 col-lg-3">
                      <input
                        type="search"
                        placeholder="Search name or email…"
                        className="form-control form-control-sm"
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value)
                          setUserPage(0)
                        }}
                      />
                    </div>
                    <div className="col-sm-6 col-lg-3">
                      <select
                        className="form-select form-select-sm"
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
                    </div>
                    <div className="col-sm-6 col-lg-3">
                      <select
                        className="form-select form-select-sm"
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
                    </div>
                    <div className="col-sm-6 col-lg-3">
                      <select
                        className="form-select form-select-sm"
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

                  <RoleTable>
                    <thead>
                      <tr>
                        <th scope="col">
                          <button type="button" className="btn btn-link btn-sm p-0 fw-bold text-decoration-none" onClick={() => sortHeader('name')}>
                            Name {userSort.key === 'name' ? (userSort.dir === 'asc' ? '↑' : '↓') : ''}
                          </button>
                        </th>
                        <th scope="col">
                          <button type="button" className="btn btn-link btn-sm p-0 fw-bold text-decoration-none" onClick={() => sortHeader('email')}>
                            Email {userSort.key === 'email' ? (userSort.dir === 'asc' ? '↑' : '↓') : ''}
                          </button>
                        </th>
                        <th scope="col">
                          <button type="button" className="btn btn-link btn-sm p-0 fw-bold text-decoration-none" onClick={() => sortHeader('role')}>
                            Role {userSort.key === 'role' ? (userSort.dir === 'asc' ? '↑' : '↓') : ''}
                          </button>
                        </th>
                        <th scope="col">Department</th>
                        <th scope="col">Job role</th>
                        <th scope="col">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                          </td>
                          <td className="text-body-secondary">{u.email}</td>
                          <td>
                            <span className="badge text-bg-secondary">{u.role}</span>
                          </td>
                          <td>{deptById.get(u.departmentId) ?? '—'}</td>
                          <td>{u.jobRoleId != null ? jobRoleById.get(u.jobRoleId) ?? u.jobRoleId : '—'}</td>
                          <td>
                            <button
                              type="button"
                              className={`btn btn-sm ${u.active ? 'btn-success' : 'btn-outline-secondary'}`}
                              disabled={busy || (me && u.id === me.id)}
                              onClick={() => toggleUserActive(u)}
                              title={me && u.id === me.id ? 'Cannot change your own status here' : 'Toggle active'}
                            >
                              {u.active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </RoleTable>
                  <div className="mt-3 d-flex flex-wrap align-items-center justify-content-between gap-2 small">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-body-secondary">Rows per page</span>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
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
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={safeUserPage <= 0}
                        onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="text-body-secondary">
                        Page {safeUserPage + 1} / {userTotalPages} · {filteredUsers.length} users
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={safeUserPage >= userTotalPages - 1}
                        onClick={() => setUserPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </RoleCard>
              </div>
            </div>
          )}

          {tab === 'departments' && (
            <div className="d-flex flex-column gap-3">
              <RoleCard title="New department" iconClass="bi-plus-lg">
                <form onSubmit={createDepartment} className="d-flex flex-wrap gap-2 align-items-end" style={{ maxWidth: '36rem' }}>
                  <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
                    <label className="form-label small mb-1">Name</label>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Department name"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                    Create
                  </button>
                </form>
              </RoleCard>

              <RoleCard title="All departments" iconClass="bi-building">
                <div className="row g-3">
                  {departments.map((d) => (
                    <div key={d.id} className="col-sm-6 col-lg-4">
                      <div className="card border h-100 shadow-sm">
                        <div className="card-body py-3">
                          <div className="fw-bold">{d.name}</div>
                          <div className="mt-2 d-flex justify-content-between align-items-center small">
                            <span className="text-body-secondary">ID {d.id}</span>
                            <span className="badge text-bg-primary">{deptUserCounts.get(d.id) || 0} users</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </RoleCard>
            </div>
          )}

          {tab === 'system' && config && (
            <div className="row">
              <div className="col-lg-6 col-xl-5">
                <RoleCard title="System configuration" iconClass="bi-gear">
                  <form onSubmit={saveConfig} className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label small mb-1">Skill gap alert threshold (rank)</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className="form-control"
                        value={gapRank}
                        onChange={(e) => setGapRank(e.target.value)}
                      />
                    </div>
                    <p className="small text-body-secondary mb-0">
                      When the computed gap rank meets or exceeds this value, training recommendations and alerts prioritize the
                      skill. Valid range: 0–10.
                    </p>
                    <button className="btn btn-primary" type="submit" disabled={busy}>
                      Save configuration
                    </button>
                  </form>
                </RoleCard>
              </div>
            </div>
          )}

          {tab === 'audit' && (
            <RoleCard
              title="Audit log"
              iconClass="bi-journal-text"
              headerRight={
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <input
                    type="search"
                    placeholder="Filter by action…"
                    className="form-control form-control-sm"
                    style={{ width: '12rem' }}
                    value={auditQ}
                    onChange={(e) => setAuditQ(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={exportAuditCsv}
                    disabled={!auditPageData?.content?.length}
                  >
                    Export page CSV
                  </button>
                </div>
              }
            >
              {auditLoading ? (
                <p className="text-body-secondary text-center py-4 mb-0">Loading audit…</p>
              ) : (
                <>
                  <RoleTable>
                    <thead>
                      <tr>
                        <th scope="col">When</th>
                        <th scope="col">Action</th>
                        <th scope="col">Actor</th>
                        <th scope="col">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(auditPageData?.content || []).map((a) => (
                        <tr key={a.id}>
                          <td className="text-nowrap font-monospace small">{formatInstant(a.createdAt)}</td>
                          <td>
                            <span className="badge text-bg-primary">{a.action}</span>
                          </td>
                          <td>{a.actor ? a.actor.email : '—'}</td>
                          <td className="text-truncate" style={{ maxWidth: '24rem' }} title={a.details}>
                            {a.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </RoleTable>
                  <div className="mt-3 d-flex flex-wrap align-items-center justify-content-between gap-2 small">
                    <span className="text-body-secondary">
                      {auditPageData ? `${auditPageData.totalElements} total events` : ''}
                    </span>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={auditPage <= 0}
                        onClick={() => setAuditPage((p) => p - 1)}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={!auditPageData || auditPage >= (auditPageData.totalPages || 1) - 1}
                        onClick={() => setAuditPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </RoleCard>
          )}

          {tab === 'permissions' && (
            <div className="d-flex flex-column gap-3">
              {!rolePerms && !error && (
                <p className="text-body-secondary text-center py-4 mb-0">Loading permission matrix…</p>
              )}
              {rolePerms && (
                <>
                  <RoleCard
                    title="Role permissions"
                    iconClass="bi-shield-lock"
                    headerRight={
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <label className="small mb-0 text-nowrap">Role</label>
                        <select className="form-select form-select-sm" style={{ width: 'auto' }} value={permRole} onChange={(e) => setPermRole(e.target.value)}>
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-sm btn-primary" onClick={saveRolePermissions} disabled={busy}>
                          Save mapping
                        </button>
                      </div>
                    }
                  >
                    <p className="small text-body-secondary mb-3">
                      <strong>{permRole}</strong> currently has <strong>{permSelection.size}</strong> permission(s). Changes replace the entire mapping for
                      that role.
                    </p>
                    <input
                      type="search"
                      placeholder="Search permissions…"
                      className="form-control form-control-sm mb-3"
                      style={{ maxWidth: '24rem' }}
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                    />
                    <div className="overflow-auto pe-1" style={{ maxHeight: '30rem' }}>
                      {groupedPermissions.map(([group, items]) => (
                        <div key={group} className="mb-4">
                          <h3 className="small text-uppercase text-body-secondary fw-bold mb-2">{group}</h3>
                          <ul className="list-unstyled row g-2 mb-0">
                            {items.map((p) => (
                              <li key={p.id} className="col-sm-6">
                                <div className="d-flex gap-2 align-items-start rounded border p-2 h-100 bg-body-secondary bg-opacity-10">
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-1 flex-shrink-0"
                                    checked={permSelection.has(p.code)}
                                    onChange={(e) => togglePermCode(p.code, e.target.checked)}
                                    id={`perm-${p.id}`}
                                  />
                                  <label htmlFor={`perm-${p.id}`} className="small mb-0 cursor-pointer">
                                    <span className="font-monospace fw-bold text-primary">{p.code}</span>
                                    {p.description ? <span className="d-block text-body-secondary mt-1">{p.description}</span> : null}
                                  </label>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </RoleCard>

                  <div className="row">
                    <div className="col-lg-6 col-xl-5">
                      <RoleCard title="Create permission" iconClass="bi-plus-circle">
                        <form onSubmit={createPermission} className="d-flex flex-column gap-3">
                          <div>
                            <label className="form-label small mb-1">Code</label>
                            <input
                              className="form-control form-control-sm font-monospace"
                              value={newPermCode}
                              onChange={(e) => setNewPermCode(e.target.value)}
                              placeholder="e.g. CUSTOM_REPORT_VIEW"
                            />
                          </div>
                          <div>
                            <label className="form-label small mb-1">Description (optional)</label>
                            <input className="form-control form-control-sm" value={newPermDesc} onChange={(e) => setNewPermDesc(e.target.value)} />
                          </div>
                          <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
                            Add permission
                          </button>
                        </form>
                      </RoleCard>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { auditToCsv, debounce, downloadBlob, downloadTextFile, usersToCsv } from './admin/adminHelpers.js'
import { parseAdminTab } from './admin/adminNavConfig.js'
import { ALL_ROLES } from './admin/adminConstants.js'
import AdminOverview from './admin/AdminOverview.jsx'
import AdminUsers from './admin/AdminUsers.jsx'
import AdminDepartments from './admin/AdminDepartments.jsx'
import AdminSystem from './admin/AdminSystem.jsx'
import AdminAudit from './admin/AdminAudit.jsx'
import AdminLoginHistory from './admin/AdminLoginHistory.jsx'
import AdminPermissions from './admin/AdminPermissions.jsx'
import { RoleAlerts, RoleLoading } from './dashboard/dashboardRoleUi.jsx'

function permissionGroup(code) {
  if (!code) return 'Other'
  if (code.startsWith('ADMIN_')) return 'Administration'
  if (code.startsWith('HR_')) return 'HR'
  if (code.startsWith('MANAGER_') || code.startsWith('MGR_')) return 'Manager'
  if (code.startsWith('EXECUTIVE_')) return 'Executive'
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
  const [integrationHealth, setIntegrationHealth] = useState(null)
  const [integrationHealthLoading, setIntegrationHealthLoading] = useState(false)
  const [systemIntelligence, setSystemIntelligence] = useState(null)
  const [systemIntelligenceLoading, setSystemIntelligenceLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [me, setMe] = useState(null)

  const [gapRank, setGapRank] = useState(2)
  const [integrationsJson, setIntegrationsJson] = useState('{\n  "ldapEnabled": false,\n  "ldapServerUrl": "",\n  "jiraBaseUrl": "",\n  "asanaWorkspaceId": ""\n}')
  const [scheduledReportingEnabled, setScheduledReportingEnabled] = useState(false)
  const [reportingRecipientEmail, setReportingRecipientEmail] = useState('')
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
      if (typeof c.data?.integrationsJson === 'string' && c.data.integrationsJson.trim()) {
        try {
          const parsed = JSON.parse(c.data.integrationsJson)
          setIntegrationsJson(JSON.stringify(parsed, null, 2))
        } catch {
          setIntegrationsJson(c.data.integrationsJson)
        }
      }
      if (typeof c.data?.scheduledReportingEnabled === 'boolean') setScheduledReportingEnabled(c.data.scheduledReportingEnabled)
      if (typeof c.data?.reportingRecipientEmail === 'string') setReportingRecipientEmail(c.data.reportingRecipientEmail)
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

  const loadIntegrationHealth = useCallback(async () => {
    setIntegrationHealthLoading(true)
    try {
      const res = await api.get('/api/admin/integrations/health')
      setIntegrationHealth(res.data)
    } catch {
      setIntegrationHealth({
        status: 'DOWN',
        checkedAt: new Date().toISOString(),
        jira: { configured: false, status: 'ERROR', missing: 'health endpoint failed' },
        asana: { configured: false, status: 'ERROR', missing: 'health endpoint failed' },
        ldap: { configured: false, status: 'ERROR', missing: 'health endpoint failed' }
      })
    } finally {
      setIntegrationHealthLoading(false)
    }
  }, [])

  const loadSystemIntelligence = useCallback(async () => {
    setSystemIntelligenceLoading(true)
    try {
      const res = await api.get('/api/admin/system-intelligence')
      setSystemIntelligence(res.data)
    } catch {
      setSystemIntelligence(null)
    } finally {
      setSystemIntelligenceLoading(false)
    }
  }, [])

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true)
    try {
      const res = await api.get('/api/admin/projects')
      setProjects(res.data || [])
    } catch {
      setProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  const createProject = useCallback(async (payload) => {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      await api.post('/api/admin/projects', payload || {})
      await loadProjects()
      setMsg('Project created.')
    } catch (e) {
      setError(e?.response?.data?.error || 'PROJECT_CREATE_FAILED')
    } finally {
      setBusy(false)
    }
  }, [loadProjects])

  const saveProjectDeadline = useCallback(async (projectId, deadlineDate) => {
    setBusy(true)
    setError('')
    setMsg('')
    try {
      await api.put(`/api/admin/projects/${projectId}/deadline`, { deadlineDate: deadlineDate || null })
      await loadProjects()
      setMsg('Project deadline updated.')
    } catch (e) {
      setError(e?.response?.data?.error || 'PROJECT_DEADLINE_UPDATE_FAILED')
    } finally {
      setBusy(false)
    }
  }, [loadProjects])

  const saveDepartmentThresholds = useCallback(async (updates) => {
    const res = await api.patch('/api/admin/system-intelligence/department-thresholds', updates || {})
    await loadSystemIntelligence()
    return res?.data
  }, [loadSystemIntelligence])

  useEffect(() => {
    if (tab !== 'system') return
    loadIntegrationHealth()
    loadSystemIntelligence()
    loadProjects()
  }, [tab, loadIntegrationHealth, loadSystemIntelligence, loadProjects])

  useEffect(() => {
    if (tab !== 'system') return undefined
    const id = window.setInterval(() => {
      loadIntegrationHealth()
      loadSystemIntelligence()
      loadProjects()
    }, 60000)
    return () => window.clearInterval(id)
  }, [tab, loadIntegrationHealth, loadSystemIntelligence, loadProjects])

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
      let integrationsPayload = integrationsJson
      try {
        integrationsPayload = JSON.stringify(JSON.parse(integrationsJson))
      } catch {
        setError('Integrations must be valid JSON.')
        setBusy(false)
        return
      }
      await api.patch('/api/admin/config', {
        gapAlertRank: rank,
        integrationsJson: integrationsPayload,
        scheduledReportingEnabled,
        reportingRecipientEmail: reportingRecipientEmail.trim() || null
      })
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
      {tab !== 'overview' &&
        tab !== 'users' &&
        tab !== 'departments' &&
        tab !== 'system' &&
        tab !== 'audit' &&
        tab !== 'login-history' &&
        tab !== 'permissions' && (
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
      )}

      <RoleAlerts error={error} success={msg} />

      {loading ? (
        <RoleLoading>Loading administration…</RoleLoading>
      ) : (
        <>
          {tab === 'overview' && stats && (
            <AdminOverview
              stats={stats}
              roleBars={roleBars}
              deptBars={deptBars}
              auditRecent={auditRecent}
              onRefresh={() => loadCore()}
              disabled={loading || busy}
            />
          )}

          {tab === 'users' && (
            <AdminUsers
              stats={stats}
              me={me}
              busy={busy}
              departments={departments}
              jobRoles={jobRoles}
              deptById={deptById}
              jobRoleById={jobRoleById}
              cuName={cuName}
              setCuName={setCuName}
              cuEmail={cuEmail}
              setCuEmail={setCuEmail}
              cuPass={cuPass}
              setCuPass={setCuPass}
              cuRole={cuRole}
              setCuRole={setCuRole}
              cuDept={cuDept}
              setCuDept={setCuDept}
              cuJobRole={cuJobRole}
              setCuJobRole={setCuJobRole}
              onCreateUser={createUser}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              userRoleFilter={userRoleFilter}
              setUserRoleFilter={setUserRoleFilter}
              userDeptFilter={userDeptFilter}
              setUserDeptFilter={setUserDeptFilter}
              userActiveFilter={userActiveFilter}
              setUserActiveFilter={setUserActiveFilter}
              userSort={userSort}
              sortHeader={sortHeader}
              pagedUsers={pagedUsers}
              filteredUsers={filteredUsers}
              safeUserPage={safeUserPage}
              userTotalPages={userTotalPages}
              setUserPage={setUserPage}
              userPageSize={userPageSize}
              setUserPageSize={setUserPageSize}
              onImportCsv={importUsersCsv}
              onExportCsv={exportUsersCsv}
              onToggleActive={toggleUserActive}
            />
          )}

          {tab === 'departments' && (
            <AdminDepartments
              stats={stats}
              departments={departments}
              deptUserCounts={deptUserCounts}
              newDeptName={newDeptName}
              setNewDeptName={setNewDeptName}
              onCreateDepartment={createDepartment}
              busy={busy}
            />
          )}

          {tab === 'system' && config && (
            <AdminSystem
              config={config}
              gapRank={gapRank}
              setGapRank={setGapRank}
              integrationsJson={integrationsJson}
              setIntegrationsJson={setIntegrationsJson}
              scheduledReportingEnabled={scheduledReportingEnabled}
              setScheduledReportingEnabled={setScheduledReportingEnabled}
              reportingRecipientEmail={reportingRecipientEmail}
              setReportingRecipientEmail={setReportingRecipientEmail}
              onSaveConfig={saveConfig}
              onDownloadPpt={async () => {
                setBusy(true)
                setError('')
                try {
                  const res = await api.get('/api/admin/reports/skill-health.pptx', { responseType: 'blob' })
                  downloadBlob('skill-health.pptx', res.data)
                } catch (e) {
                  setError(e?.message || 'DOWNLOAD_FAILED')
                } finally {
                  setBusy(false)
                }
              }}
              onDownloadCompliancePack={async () => {
                setBusy(true)
                setError('')
                try {
                  const res = await api.get('/api/admin/audit/compliance-pack.zip', { responseType: 'blob' })
                  downloadBlob('audit-compliance-pack.zip', res.data)
                } catch (e) {
                  setError(e?.message || 'DOWNLOAD_FAILED')
                } finally {
                  setBusy(false)
                }
              }}
              integrationHealth={integrationHealth}
              integrationHealthLoading={integrationHealthLoading}
              onRefreshIntegrationHealth={loadIntegrationHealth}
              systemIntelligence={systemIntelligence}
              systemIntelligenceLoading={systemIntelligenceLoading}
              onRefreshSystemIntelligence={loadSystemIntelligence}
              onSaveDepartmentThresholds={saveDepartmentThresholds}
              projects={projects}
              projectsLoading={projectsLoading}
              jobRoles={jobRoles}
              onRefreshProjects={loadProjects}
              onCreateProject={createProject}
              onSaveProjectDeadline={saveProjectDeadline}
              busy={busy}
            />
          )}

          {tab === 'audit' && (
            <AdminAudit
              auditQ={auditQ}
              setAuditQ={setAuditQ}
              auditLoading={auditLoading}
              auditPageData={auditPageData}
              auditPage={auditPage}
              setAuditPage={setAuditPage}
              onExportCsv={exportAuditCsv}
            />
          )}

          {tab === 'login-history' && <AdminLoginHistory />}

          {tab === 'permissions' && (
            <AdminPermissions
              matrixLoading={!rolePerms && !error}
              rolePerms={rolePerms}
              permissionsTotal={permissions.length}
              permRole={permRole}
              setPermRole={setPermRole}
              permSelection={permSelection}
              togglePermCode={togglePermCode}
              saveRolePermissions={saveRolePermissions}
              permSearch={permSearch}
              setPermSearch={setPermSearch}
              groupedPermissions={groupedPermissions}
              newPermCode={newPermCode}
              setNewPermCode={setNewPermCode}
              newPermDesc={newPermDesc}
              setNewPermDesc={setNewPermDesc}
              createPermission={createPermission}
              busy={busy}
            />
          )}
        </>
      )}
    </>
  )
}

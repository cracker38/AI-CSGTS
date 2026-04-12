/** Admin dashboard sections — sidebar + ?tab= query (shared with DashboardLayout). */
export const ADMIN_TAB_IDS = ['overview', 'users', 'departments', 'system', 'audit', 'login-history', 'permissions']

export const ADMIN_TAB_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'bi-speedometer2' },
  { id: 'users', label: 'Users', icon: 'bi-people' },
  { id: 'departments', label: 'Departments', icon: 'bi-building' },
  { id: 'system', label: 'System', icon: 'bi-gear' },
  { id: 'audit', label: 'Audit log', icon: 'bi-journal-text' },
  { id: 'login-history', label: 'Login history', icon: 'bi-door-open' },
  { id: 'permissions', label: 'Permissions', icon: 'bi-shield-lock' }
]

export function adminTabLabel(id) {
  const map = {
    overview: 'Overview',
    users: 'Users',
    departments: 'Departments',
    system: 'System',
    audit: 'Audit log',
    'login-history': 'Login history',
    permissions: 'Permissions'
  }
  return map[id] || id
}

/** Accepts `location.search` or a URLSearchParams-like object with `.get('tab')`. */
export function parseAdminTab(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const t = params.get('tab')
  if (t && ADMIN_TAB_IDS.includes(t)) return t
  return 'overview'
}

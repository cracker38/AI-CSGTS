/** Sidebar + URL helpers for role dashboards (mirrors admin ?tab= pattern for HR). */

export const EMPLOYEE_SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'bi-speedometer2', hash: '' },
  { id: 'skill-gaps', label: 'Skill gaps', icon: 'bi-bar-chart-steps', hash: 'skill-gaps' },
  { id: 'my-skills', label: 'My skills', icon: 'bi-stars', hash: 'my-skills' },
  { id: 'training-recs', label: 'Training', icon: 'bi-lightbulb', hash: 'training-recs' },
  { id: 'training-activity', label: 'Activity', icon: 'bi-bell', hash: 'training' }
]

export const MANAGER_SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'bi-speedometer2', hash: '' },
  { id: 'insights', label: 'Insights', icon: 'bi-graph-up-arrow', hash: 'insights' },
  { id: 'team', label: 'Team roster', icon: 'bi-people', hash: 'team' },
  { id: 'approvals', label: 'Training approvals', icon: 'bi-check2-circle', hash: 'approvals' },
  { id: 'projects', label: 'Staffing', icon: 'bi-kanban', hash: 'projects' },
  { id: 'performance', label: 'Readiness', icon: 'bi-activity', hash: 'performance' }
]

export const HR_SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'bi-speedometer2' },
  { id: 'people', label: 'Employees', icon: 'bi-people' },
  { id: 'taxonomy', label: 'Skill taxonomy', icon: 'bi-diagram-3' },
  { id: 'succession', label: 'Succession', icon: 'bi-diagram-2' },
  { id: 'training', label: 'Training programs', icon: 'bi-journal-bookmark' },
  { id: 'workflows', label: 'Approvals & requests', icon: 'bi-inboxes' }
]

export const HR_TAB_IDS = HR_SIDEBAR_ITEMS.map((i) => i.id)

export function parseHrTab(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const t = params.get('tab')
  if (t && HR_TAB_IDS.includes(t)) return t
  return 'overview'
}

export function hrTabLabel(id) {
  const row = HR_SIDEBAR_ITEMS.find((i) => i.id === id)
  return row?.label || id
}

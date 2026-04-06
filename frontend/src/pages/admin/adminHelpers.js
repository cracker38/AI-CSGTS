export function downloadTextFile(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvEscape(s) {
  if (s == null) return ''
  const str = String(s)
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function usersToCsv(rows) {
  const headers = ['name', 'email', 'role', 'active', 'departmentId', 'jobRoleId']
  const lines = [headers.join(',')]
  for (const u of rows) {
    lines.push(
      [
        csvEscape(u.name),
        csvEscape(u.email),
        u.role,
        u.active,
        u.departmentId ?? '',
        u.jobRoleId ?? ''
      ].join(',')
    )
  }
  return lines.join('\r\n')
}

export function auditToCsv(rows) {
  const headers = ['createdAt', 'action', 'actorEmail', 'details']
  const lines = [headers.join(',')]
  for (const a of rows) {
    lines.push(
      [
        csvEscape(formatInstant(a.createdAt)),
        csvEscape(a.action),
        csvEscape(a.actor?.email ?? ''),
        csvEscape(a.details ?? '')
      ].join(',')
    )
  }
  return lines.join('\r\n')
}

export function formatInstant(iso) {
  if (iso == null) return ''
  return String(iso).slice(0, 19).replace('T', ' ')
}

export function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

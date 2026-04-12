import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { BRAND_SUBTITLE, BRAND_TITLE } from '../content/branding'

function getPasswordScore(value) {
  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/[0-9]/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return score
}

const DEFAULT_STAFF_ROLES = [
  {
    id: 'MANAGER',
    label: 'Manager',
    summary: 'Team readiness, training approvals, and project staffing for your department.'
  },
  {
    id: 'HR',
    label: 'Human resources',
    summary: 'Employee directory, skill taxonomy, training programs, and assignment workflows.'
  }
]

export default function Register() {
  const [staffRole, setStaffRole] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [jobRoleId, setJobRoleId] = useState('')
  const [departments, setDepartments] = useState([])
  const [jobRoles, setJobRoles] = useState([])
  const [staffRoleOptions, setStaffRoleOptions] = useState(DEFAULT_STAFF_ROLES)
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()

  async function loadOptions() {
    setLoadingOptions(true)
    setError('')
    api
      .get('/api/public/registration-options')
      .then((res) => {
        setDepartments(res.data.departments || [])
        setJobRoles(res.data.jobRoles || [])
        if (Array.isArray(res.data.selfServiceRoles) && res.data.selfServiceRoles.length > 0) {
          setStaffRoleOptions(res.data.selfServiceRoles)
        }
        const noDept = (res.data.departments || []).length === 0
        if (noDept) {
          setOptionsLoaded(false)
          setError('No departments are configured yet. Ask a system administrator to add at least one department.')
        } else {
          setOptionsLoaded(true)
        }
      })
      .catch((e) => {
        const msg = String(e?.message || '')
        if (msg.includes('Network Error')) {
          setError('Cannot reach backend API (http://localhost:8080). Start the backend, then refresh this page.')
        } else {
          setError('Unable to load registration options.')
        }
        setOptionsLoaded(false)
      })
      .finally(() => {
        setLoadingOptions(false)
      })
  }

  useEffect(() => {
    loadOptions()
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const score = getPasswordScore(password)

    if (!staffRole || (staffRole !== 'MANAGER' && staffRole !== 'HR')) {
      setError('Choose whether you are registering as a Manager or as HR.')
      return
    }
    if (trimmedName.length < 3) {
      setError('Please enter your full name (at least 3 characters).')
      return
    }
    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid work email.')
      return
    }
    if (score < 3) {
      setError('Use a stronger password (8+ chars, uppercase, number, special character).')
      return
    }
    if (password !== confirmPassword) {
      setError('Password and confirmation do not match.')
      return
    }
    if (!optionsLoaded) {
      setError('Registration is unavailable until departments are loaded.')
      return
    }
    if (!departmentId) {
      setError('Select the department you belong to.')
      return
    }
    if (!agree) {
      setError('Confirm the attestation below to continue.')
      return
    }

    try {
      setLoading(true)
      await api.post('/api/auth/register', {
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: staffRole,
        departmentId: Number(departmentId),
        jobRoleId: jobRoleId ? Number(jobRoleId) : null
      })
      setSuccess(`Account created as ${staffRole === 'MANAGER' ? 'Manager' : 'HR'}. Redirecting to sign in…`)
      setTimeout(() => navigate('/login', { replace: true }), 1400)
    } catch (err) {
      const code = err?.response?.data?.error
      if (code === 'REGISTER_STAFF_ONLY') {
        setError('Only Manager or HR registration is allowed on this page.')
      } else if (code === 'EMAIL_ALREADY_EXISTS') {
        setError('That email is already registered. Sign in or use a different address.')
      } else {
        setError(code || 'REGISTER_FAILED')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page auth-page--register auth-page--staff-register">
      <div className="auth-panel auth-panel--brand">
        <div className="brand-block">
          <h1>{BRAND_TITLE}</h1>
          <div className="brand-sub">{BRAND_SUBTITLE}</div>
        </div>
        <p className="brand-intro">
          Leadership onboarding: register as <strong>Manager</strong> or <strong>HR</strong>, map yourself to a department, and
          sign in to the right workspace immediately.
        </p>
        <div className="auth-feature-grid">
          <div className="feature-card">
            <h3>Managers</h3>
            <p>Direct reports, skill-gap summaries, training approvals, and smart project allocation for your department.</p>
          </div>
          <div className="feature-card">
            <h3>HR professionals</h3>
            <p>Directory, taxonomy, programs, and training workflows — scoped by the permissions for your HR role.</p>
          </div>
          <div className="feature-card">
            <h3>Employees</h3>
            <p>Individual contributor accounts are <strong>not</strong> created on this page. An administrator provisions employees from the admin console.</p>
          </div>
          <div className="feature-card">
            <h3>Security</h3>
            <p>Strong passwords, optional job-role mapping for reporting lines, and the same JWT access model as the rest of the platform.</p>
          </div>
        </div>
      </div>

      <div className="auth-panel auth-panel--form">
        <div className="register-staff-head">
          <p className="register-staff-eyebrow">Staff registration</p>
          <h2>Manager &amp; HR enrollment</h2>
          <p className="auth-subtitle register-staff-lead">
            Complete each section. Only <strong>Manager</strong> and <strong>HR</strong> accounts can be created here — for example
            leadership accounts such as <strong>SHEMA Patrick</strong> (<code>shema@gmail.com</code>) as a department manager.
          </p>
        </div>
        <div className="auth-divider" />

        <form className="card auth-card auth-card--register register-staff-form" onSubmit={submit}>
          <fieldset className="register-staff-fieldset" disabled={!optionsLoaded}>
            <legend className="register-staff-legend">
              <span className="register-staff-step">1</span>
              Role
            </legend>
            <p className="register-staff-hint">Select how you will use the platform. This cannot be changed without an administrator.</p>
            <div className="register-staff-role-grid">
              {staffRoleOptions.map((opt) => {
                const id = opt.id
                const active = staffRole === id
                return (
                  <button
                    key={id}
                    type="button"
                    className={`register-staff-role-card${active ? ' register-staff-role-card--active' : ''}`}
                    onClick={() => setStaffRole(id)}
                  >
                    <span className="register-staff-role-card__badge">{id === 'MANAGER' ? 'M' : 'HR'}</span>
                    <span className="register-staff-role-card__title">{opt.label || id}</span>
                    <span className="register-staff-role-card__desc">{opt.summary || ''}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="register-staff-fieldset" disabled={!optionsLoaded}>
            <legend className="register-staff-legend">
              <span className="register-staff-step">2</span>
              Identity &amp; security
            </legend>
            <div className="auth-form-grid">
              <label>
                Full name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., SHEMA Patrick" required />
              </label>
              <label>
                Work email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="shema@gmail.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Password
                <div className="input-inline">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Strong password"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="btn btn--ghost input-inline__btn input-inline__btn--toggle" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="auth-strength">
                  <div className="password-meter">
                    <div className="password-meter__bar" style={{ width: `${getPasswordScore(password) * 25}%` }} />
                  </div>
                  <div className="auth-strength__label">
                    Strength: <b>{['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][getPasswordScore(password)]}</b>
                  </div>
                </div>
              </label>
              <label>
                Confirm password
                <div className="input-inline">
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn--ghost input-inline__btn input-inline__btn--toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
            </div>
          </fieldset>

          <fieldset className="register-staff-fieldset" disabled={!optionsLoaded}>
            <legend className="register-staff-legend">
              <span className="register-staff-step">3</span>
              Organization
            </legend>
            <p className="register-staff-hint">Department is required. Job role is optional (used for competency templates when applicable).</p>
            <div className="auth-form-grid">
              <label>
                Department
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required disabled={!optionsLoaded}>
                  <option value="">{loadingOptions ? 'Loading…' : 'Select department'}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Job role <span className="register-staff-optional">(optional)</span>
                <select value={jobRoleId} onChange={(e) => setJobRoleId(e.target.value)} disabled={!optionsLoaded}>
                  <option value="">— None —</option>
                  {jobRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {!optionsLoaded && (
            <button type="button" className="btn btn--ghost" onClick={loadOptions} disabled={loadingOptions} style={{ marginTop: 10 }}>
              {loadingOptions ? 'Retrying…' : 'Retry loading options'}
            </button>
          )}

          <label className="auth-checkbox register-staff-attest">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I confirm I am authorized to hold a <strong>Manager</strong> or <strong>HR</strong> account in this organization, the information
              above is accurate, and I understand <strong>employee</strong> accounts are created only by an administrator — not through this form.
            </span>
          </label>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <button className="btn auth-submit register-staff-submit" type="submit" disabled={loading || !optionsLoaded}>
            {loading ? 'Creating account…' : 'Create Manager / HR account'}
          </button>

          <div className="muted">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

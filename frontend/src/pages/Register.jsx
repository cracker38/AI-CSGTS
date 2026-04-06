import React, { useState } from 'react'
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

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [jobRoleId, setJobRoleId] = useState('')
  const [departments, setDepartments] = useState([])
  const [jobRoles, setJobRoles] = useState([])
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
        const noOptions = (res.data.departments || []).length === 0 || (res.data.jobRoles || []).length === 0
        if (noOptions) {
          setOptionsLoaded(false)
          setError('Departments/Job Roles are not configured yet. Ask Admin/HR to set them up.')
        } else {
          setOptionsLoaded(true)
        }
      })
      .catch((e) => {
        const msg = String(e?.message || '')
        if (msg.includes('Network Error')) {
          setError('Cannot reach backend API (http://localhost:8080). Start backend, then refresh this page.')
        } else {
          setError('Unable to load department/job role options.')
        }
        setOptionsLoaded(false)
      })
      .finally(() => {
        setLoadingOptions(false)
      })
  }

  React.useEffect(() => {
    loadOptions()
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const score = getPasswordScore(password)

    if (trimmedName.length < 3) {
      setError('Please enter your full name (at least 3 characters).')
      return
    }
    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid work email.')
      return
    }
    if (score < 3) {
      setError('Use a stronger password (8+ chars, uppercase, number, special char).')
      return
    }
    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.')
      return
    }
    if (!optionsLoaded) {
      setError('Registration is disabled until Department and Job Role are loaded from the database.')
      return
    }
    if (!departmentId || !jobRoleId) {
      setError('Please select both Department and Job Role.')
      return
    }
    if (!agree) {
      setError('Please agree to the terms before registration.')
      return
    }

    try {
      setLoading(true)
      await api.post('/api/auth/register', {
        name: trimmedName,
        email: trimmedEmail,
        password,
        departmentId: Number(departmentId),
        jobRoleId: Number(jobRoleId)
      })
      setSuccess('Registration successful. Your role is set to EMPLOYEE. Redirecting to login...')
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err) {
      setError(err?.response?.data?.error || 'REGISTER_FAILED')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page auth-page--register">
      <div className="auth-panel auth-panel--brand">
        <div className="brand-block">
          <h1>{BRAND_TITLE}</h1>
          <div className="brand-sub">{BRAND_SUBTITLE}</div>
        </div>
        <p className="brand-intro">
          Enterprise onboarding for competency-driven workforce development with profile validation, skill tracking, and growth planning.
        </p>
        <div className="auth-feature-grid">
          <div className="feature-card">
            <h3>Employee Self-Service</h3>
            <p>Maintain skill profiles, training progress, career goals, and development plans in one place.</p>
          </div>
          <div className="feature-card">
            <h3>Manager & HR Workflow</h3>
            <p>Support approvals, team competency reviews, succession planning, and compliance monitoring.</p>
          </div>
          <div className="feature-card">
            <h3>Admin & Configuration</h3>
            <p>Configure taxonomy, thresholds, integrations, alerts, and organization structure controls.</p>
          </div>
          <div className="feature-card">
            <h3>Audit & Compliance</h3>
            <p>Track immutable history of profile, assessment, and assignment changes with export-ready logs.</p>
          </div>
        </div>
      </div>

      <div className="auth-panel auth-panel--form">
        <h2>Create Account</h2>
        <div className="auth-divider" />
        <form className="card auth-card auth-card--register" onSubmit={submit}>
          <div className="auth-form-grid">
            <label>
              Full Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe"
                required
              />
            </label>
            <label>
              Work Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="name@company.com"
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
                <button
                  type="button"
                  className="btn btn--ghost input-inline__btn input-inline__btn--toggle"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="auth-strength">
                <div className="password-meter">
                  <div
                    className="password-meter__bar"
                    style={{ width: `${getPasswordScore(password) * 25}%` }}
                  />
                </div>
                <div className="auth-strength__label">
                  Strength: <b>{['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][getPasswordScore(password)]}</b>
                </div>
              </div>
            </label>
            <label>
              Confirm Password
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
            <label>
              Department
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                disabled={!optionsLoaded}
              >
                <option value="">{loadingOptions ? 'Loading departments...' : 'Select Department'}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label>
              Job Role
              <select
                value={jobRoleId}
                onChange={(e) => setJobRoleId(e.target.value)}
                required
                disabled={!optionsLoaded}
              >
                <option value="">{loadingOptions ? 'Loading job roles...' : 'Select Job Role'}</option>
                {jobRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
          </div>

          {!optionsLoaded && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={loadOptions}
              disabled={loadingOptions}
              style={{ marginTop: 10 }}
            >
              {loadingOptions ? 'Retrying...' : 'Retry Loading Options'}
            </button>
          )}

          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>I confirm the information is accurate and this account is for employee use.</span>
          </label>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <button className="btn auth-submit" type="submit" disabled={loading || !optionsLoaded}>
            {loading ? 'Creating account...' : 'Create Employee Account'}
          </button>

          <div className="muted">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}


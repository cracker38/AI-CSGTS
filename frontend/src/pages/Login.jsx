import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { isRememberMeEnabled, setToken } from '../auth'
import { BRAND_SUBTITLE, BRAND_TITLE } from '../content/branding'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [rememberMe, setRememberMe] = useState(isRememberMeEnabled())
  const navigate = useNavigate()
  const canSubmit = useMemo(() => email.trim() !== '' && password.trim() !== '' && !loading, [email, password, loading])

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (!email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        rememberMe
      })
      setToken(res.data.token, rememberMe)
      onLogin?.(res.data.user)
      navigate(`/${res.data.user.role.toLowerCase()}`, { replace: true })
    } catch (err) {
      const nextAttempts = loginAttempts + 1
      setLoginAttempts(nextAttempts)
      if (nextAttempts >= 3) {
        setError('Invalid credentials. Please verify email/password or reset your account with Admin/HR.')
      } else {
        setError(err?.response?.data?.error || 'LOGIN_FAILED')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel auth-panel--brand">
        <div className="brand-block">
          <h1>{BRAND_TITLE}</h1>
          <div className="brand-sub">{BRAND_SUBTITLE}</div>
        </div>

        <p className="brand-intro">
          Intelligent platform for competency assessment, skill-gap analysis, AI-driven insights, training recommendations, and project staffing decisions.
        </p>

        <div className="auth-feature-grid">
          <div className="feature-card">
            <h3>User & Role Management</h3>
            <p>Secure access with role-based permissions, profile approval workflows, and full audit visibility.</p>
          </div>
          <div className="feature-card">
            <h3>Competency & Skill Gaps</h3>
            <p>Compare current vs required skills with severity scoring and real-time gap indicators.</p>
          </div>
          <div className="feature-card">
            <h3>AI Analytics & Training</h3>
            <p>Predict demand, detect skill decay, and generate personalized learning recommendations.</p>
          </div>
          <div className="feature-card">
            <h3>Allocation & Reporting</h3>
            <p>Assign best-fit resources, monitor utilization, and deliver decision-ready dashboards.</p>
          </div>
        </div>
      </div>

      <div className="auth-panel auth-panel--form">
        <h2>Welcome Back</h2>
        <div className="auth-subtitle">Sign in to access your account</div>
        <div className="auth-divider" />
        <form className="card auth-card" onSubmit={submit}>
          <label>
            Email Address
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
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
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="btn btn--ghost input-inline__btn"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="auth-inline-check">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          {error && <div className="error">{error}</div>}
          <button className="btn" type="submit" disabled={!canSubmit}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="muted">
            New to the platform? <Link to="/register">Create your AI-CSGTS account</Link>
          </div>
          <p className="muted" style={{ marginTop: '0.75rem', fontSize: '0.85rem', lineHeight: 1.45 }}>
            Employee accounts are issued by an administrator — this link is only for Manager and HR self-enrollment.
          </p>
        </form>
      </div>
    </div>
  )
}


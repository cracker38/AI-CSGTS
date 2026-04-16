import React, { useEffect, useMemo, useState } from 'react'
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

const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']

const WIZARD_STEPS = [
  { id: 1, short: 'Profile' },
  { id: 2, short: 'Security' },
  { id: 3, short: 'Review' }
]

const MAX_STEP = 3

/** Human-readable text from Spring / axios 400 bodies (error code, validation, ProblemDetail). */
function messageFromRegisterFailure(err) {
  const data = err?.response?.data
  if (!data || typeof data !== 'object') {
    return null
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message.trim()
  }
  if (typeof data.detail === 'string' && data.detail.trim()) {
    return data.detail.trim()
  }
  if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const parts = []
    for (const [field, msgs] of Object.entries(data.errors)) {
      if (Array.isArray(msgs)) {
        for (const m of msgs) {
          if (m) parts.push(`${field}: ${m}`)
        }
      } else if (msgs) {
        parts.push(`${field}: ${msgs}`)
      }
    }
    if (parts.length) return parts.join(' ')
  }
  if (Array.isArray(data.errors)) {
    const parts = data.errors.map((e) => e?.defaultMessage || e?.message).filter(Boolean)
    if (parts.length) return parts.join(' ')
  }
  return null
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [jobRoleId, setJobRoleId] = useState('')
  const [availableSkills, setAvailableSkills] = useState([])
  const [onboardingSkillId, setOnboardingSkillId] = useState('')
  const [onboardingSkillLevel, setOnboardingSkillLevel] = useState('INTERMEDIATE')
  const [initialSkills, setInitialSkills] = useState([])
  const [certTitle, setCertTitle] = useState('')
  const [certIssuer, setCertIssuer] = useState('')
  const [initialCertifications, setInitialCertifications] = useState([])
  const [cvText, setCvText] = useState('')
  const [careerGoalsText, setCareerGoalsText] = useState('')
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

  const pwdScore = getPasswordScore(password)

  const selectedDeptName = useMemo(() => {
    const d = departments.find((x) => String(x.id) === String(departmentId))
    return d?.name || '—'
  }, [departments, departmentId])

  const selectedJobName = useMemo(() => {
    const r = jobRoles.find((x) => String(x.id) === String(jobRoleId))
    return r?.name || '—'
  }, [jobRoles, jobRoleId])

  async function loadOptions() {
    setLoadingOptions(true)
    setError('')
    api
      .get('/api/public/registration-options')
      .then((res) => {
        setDepartments(res.data.departments || [])
        setJobRoles(res.data.jobRoles || [])
        setAvailableSkills(res.data.skills || [])
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
          setError('Cannot reach backend API. Start the backend, then refresh this page.')
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

  function validateStep(s) {
    setError('')
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (s === 1) {
      if (trimmedName.length < 3) {
        setError('Enter your full name (at least 3 characters).')
        return false
      }
      if (!trimmedEmail.includes('@')) {
        setError('Enter a valid work email.')
        return false
      }
      if (!departmentId) {
        setError('Select your department.')
        return false
      }
      if (jobRoles.length === 0) {
        setError('No job roles are configured yet. An administrator must add job roles before employees can register.')
        return false
      }
      if (!jobRoleId) {
        setError('Select your job role — required for skill-gap analysis and training recommendations vs role requirements.')
        return false
      }
    }
    if (s === 2) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters (required by the server).')
        return false
      }
      if (pwdScore < 3) {
        setError('Use a stronger password: include uppercase, a number, and a special character.')
        return false
      }
      if (password !== confirmPassword) {
        setError('Password and confirmation do not match.')
        return false
      }
    }
    return true
  }

  function goNext() {
    if (!optionsLoaded) return
    if (!validateStep(step)) return
    setStep((x) => Math.min(MAX_STEP, x + 1))
  }

  function goBack() {
    setError('')
    setStep((x) => Math.max(1, x - 1))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateStep(1) || !validateStep(2)) {
      setStep(1)
      return
    }
    if (!optionsLoaded) {
      setError('Registration is unavailable until departments are loaded.')
      return
    }
    if (!agree) {
      setError('Confirm the attestation to create your account.')
      return
    }
    if (initialSkills.length === 0) {
      setError('Add at least one initial skill before creating your account.')
      return
    }
    if (!cvText.trim() && !careerGoalsText.trim()) {
      setError('Provide CV text or career goals before creating your account.')
      return
    }

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    try {
      setLoading(true)
      await api.post('/api/auth/register', {
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: 'EMPLOYEE',
        departmentId: Number(departmentId),
        jobRoleId: Number(jobRoleId),
        cvText: cvText.trim() || null,
        careerGoalsText: careerGoalsText.trim() || null,
        initialSkills,
        initialCertifications
      })
      setSuccess('Welcome to AI-CSGTS — your employee account is ready. Redirecting to sign in…')
      setTimeout(() => navigate('/login', { replace: true }), 1600)
    } catch (err) {
      const data = err?.response?.data
      const code = typeof data?.error === 'string' ? data.error : null
      const validationHint = messageFromRegisterFailure(err)
      if (code === 'REGISTER_STAFF_ONLY') {
        setError(
          'The API you are hitting still expects Manager/HR signup only. Stop the old backend, run the current AI-CSGTS Spring Boot app from this project, then try again.'
        )
      } else if (code === 'REGISTER_EMPLOYEE_ONLY' || code === 'REGISTER_ROLE_NOT_ALLOWED') {
        setError(
          'This endpoint only accepts employees. Manager, HR, Executive, and Admin users are added under Administration in the Admin dashboard.'
        )
      } else if (code === 'JOB_ROLE_REQUIRED_FOR_EMPLOYEE') {
        setError('Select a job role on the Profile step — it is required for competency mapping.')
        setStep(1)
      } else if (code === 'INITIAL_SKILL_REQUIRED') {
        setError('At least one initial skill is required at registration.')
        setStep(3)
      } else if (code === 'CV_OR_CAREER_GOALS_REQUIRED') {
        setError('Provide CV text or career goals at registration.')
        setStep(3)
      } else if (code === 'EMAIL_ALREADY_EXISTS') {
        setError('That email is already registered. Sign in or use a different address.')
      } else if (code === 'INVALID_DEPARTMENT_ID') {
        setError('That department is no longer valid. Refresh the page and select a department again.')
        setStep(1)
      } else if (code === 'INVALID_JOB_ROLE_ID') {
        setError('That job role is no longer valid. Refresh the page and select a job role again.')
        setStep(1)
      } else if (validationHint) {
        setError(validationHint)
      } else {
        setError(code || 'Registration failed. Check the backend is running and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldsetDisabled = !optionsLoaded

  function addInitialSkill() {
    if (!onboardingSkillId) return
    const id = Number(onboardingSkillId)
    if (initialSkills.some((s) => Number(s.skillId) === id)) return
    setInitialSkills((prev) => [...prev, { skillId: id, level: onboardingSkillLevel }])
    setOnboardingSkillId('')
  }

  function removeInitialSkill(skillIdToRemove) {
    setInitialSkills((prev) => prev.filter((s) => Number(s.skillId) !== Number(skillIdToRemove)))
  }

  function addInitialCertification() {
    if (!certTitle.trim()) return
    setInitialCertifications((prev) => [
      ...prev,
      {
        title: certTitle.trim(),
        issuer: certIssuer.trim() || null
      }
    ])
    setCertTitle('')
    setCertIssuer('')
  }

  function removeInitialCertification(idx) {
    setInitialCertifications((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="auth-page auth-page--register auth-page--staff-register auth-page--ai-register">
      <div className="auth-panel auth-panel--brand">
        <div className="brand-block">
          <h1>{BRAND_TITLE}</h1>
          <div className="brand-sub">{BRAND_SUBTITLE}</div>
        </div>
        <p className="brand-intro">
          <strong>AI-Powered Competency &amp; Skill Gap Tracking</strong> for IT organizations: centralize skills, compare profiles to job roles and
          projects, surface gaps with clear severity, and align training and staffing with data — with optional AI-assisted coaching and job-description
          analysis where configured.
        </p>
        <div className="auth-feature-grid register-ai-feature-grid">
          <div className="feature-card">
            <h3>Employees</h3>
            <p>
              <strong>Register on this page</strong> — map to a job role, then use your workspace for skills, gaps, certifications, and training paths.
            </p>
          </div>
          <div className="feature-card">
            <h3>Managers</h3>
            <p>
              Team roster, gap risk, training approvals, and project staffing. <strong>Accounts are created only in the Admin dashboard</strong> — not on
              this form.
            </p>
          </div>
          <div className="feature-card">
            <h3>HR</h3>
            <p>
              Directory, taxonomy, programs, and workflows. <strong>HR accounts are provisioned by an administrator</strong> in the Admin dashboard.
            </p>
          </div>
          <div className="feature-card">
            <h3>Trust &amp; scale</h3>
            <p>Role-based access, strong authentication, and a foundation for audit history and HRIS/LMS integrations.</p>
          </div>
        </div>
      </div>

      <div className="auth-panel auth-panel--form">
        <div className="register-ai-head">
          <p className="register-staff-eyebrow">Employee registration</p>
          <h2>Join AI-CSGTS</h2>
          <p className="auth-subtitle register-ai-lead">
            Three steps: your profile and organization, a secure password, then review. You must select a <strong>job role</strong> so required skills and
            gap analysis work correctly. Manager and HR sign-ups are handled in <strong>Administration</strong>.
          </p>
        </div>

        <div className="register-ai-progress" role="list" aria-label="Registration steps">
          {WIZARD_STEPS.map((s) => {
            const done = step > s.id
            const active = step === s.id
            return (
              <div
                key={s.id}
                role="listitem"
                className={`register-ai-progress__step${active ? ' register-ai-progress__step--active' : ''}${done ? ' register-ai-progress__step--done' : ''}`}
              >
                <span className="register-ai-progress__num">{done ? <i className="bi bi-check-lg" aria-hidden /> : s.id}</span>
                <span className="register-ai-progress__label">{s.short}</span>
              </div>
            )
          })}
        </div>

        <div className="auth-divider" />

        <form className="card auth-card auth-card--register register-ai-form" onSubmit={step === MAX_STEP ? submit : (e) => e.preventDefault()}>
          {step === 1 && (
            <fieldset className="register-staff-fieldset register-ai-fieldset" disabled={fieldsetDisabled}>
              <legend className="register-staff-legend">
                <span className="register-staff-step">1</span>
                Profile &amp; organization
              </legend>
              <p className="register-staff-hint">
                Your <strong>department</strong> places you in the org for reporting and staffing. Your <strong>job role</strong> defines required skills for
                gap analysis, training recommendations, and project fit (competency &amp; skill-gap modules).
              </p>
              <div className="auth-form-grid">
                <label>
                  Full name
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Alex Morgan" required autoComplete="name" />
                </label>
                <label>
                  Work email
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Department <span className="register-ai-req">*</span>
                  <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required disabled={fieldsetDisabled}>
                    <option value="">{loadingOptions ? 'Loading…' : 'Select department'}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Job role <span className="register-ai-req">* required</span>
                  <select value={jobRoleId} onChange={(e) => setJobRoleId(e.target.value)} disabled={fieldsetDisabled} required>
                    <option value="">Select job role for competency mapping</option>
                    {jobRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {jobRoles.length === 0 && optionsLoaded && (
                <p className="register-ai-callout">
                  <i className="bi bi-info-circle me-1" aria-hidden />
                  No job roles are configured yet. Ask an administrator to define roles and required skills before employees can register.
                </p>
              )}
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="register-staff-fieldset register-ai-fieldset" disabled={fieldsetDisabled}>
              <legend className="register-staff-legend">
                <span className="register-staff-step">2</span>
                Security
              </legend>
              <p className="register-staff-hint">Use a strong password to protect competency and personal data (access control supports GDPR-style expectations).</p>
              <div className="auth-form-grid">
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
                    <div className="password-meter register-ai-meter">
                      <div className="password-meter__bar" style={{ width: `${pwdScore * 25}%` }} />
                    </div>
                    <div className="auth-strength__label">
                      Strength: <b>{STRENGTH_LABELS[pwdScore]}</b>
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
          )}

          {step === 3 && (
            <fieldset className="register-staff-fieldset register-ai-fieldset" disabled={fieldsetDisabled}>
              <legend className="register-staff-legend">
                <span className="register-staff-step">3</span>
                Review &amp; create
              </legend>
              <div className="register-ai-summary">
                <div className="register-ai-summary__row">
                  <span className="register-ai-summary__k">Account type</span>
                  <span className="register-ai-summary__v">Employee</span>
                </div>
                <div className="register-ai-summary__row">
                  <span className="register-ai-summary__k">Name</span>
                  <span className="register-ai-summary__v">{name.trim() || '—'}</span>
                </div>
                <div className="register-ai-summary__row">
                  <span className="register-ai-summary__k">Email</span>
                  <span className="register-ai-summary__v">{email.trim() || '—'}</span>
                </div>
                <div className="register-ai-summary__row">
                  <span className="register-ai-summary__k">Department</span>
                  <span className="register-ai-summary__v">{selectedDeptName}</span>
                </div>
                <div className="register-ai-summary__row">
                  <span className="register-ai-summary__k">Job role</span>
                  <span className="register-ai-summary__v">{selectedJobName}</span>
                </div>
              </div>

              <div className="auth-form-grid mt-3">
                <label>
                  CV text (for initial analysis) <span className="register-ai-req">*</span>
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    rows={4}
                    placeholder="Paste CV summary or profile highlights..."
                  />
                </label>
                <label>
                  Career goals <span className="register-ai-req">*</span>
                  <textarea
                    value={careerGoalsText}
                    onChange={(e) => setCareerGoalsText(e.target.value)}
                    rows={4}
                    placeholder="e.g. Become a senior backend engineer in 12 months."
                  />
                </label>
              </div>

              <div className="auth-form-grid mt-2">
                <label>
                  Add initial skill <span className="register-ai-req">*</span>
                  <div className="input-inline">
                    <select value={onboardingSkillId} onChange={(e) => setOnboardingSkillId(e.target.value)}>
                      <option value="">Select skill</option>
                      {availableSkills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.category ? ` · ${s.category}` : ''}
                        </option>
                      ))}
                    </select>
                    <select value={onboardingSkillLevel} onChange={(e) => setOnboardingSkillLevel(e.target.value)}>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="EXPERT">Expert</option>
                    </select>
                    <button type="button" className="btn btn--ghost input-inline__btn" onClick={addInitialSkill}>
                      Add
                    </button>
                  </div>
                  {initialSkills.length > 0 ? (
                    <div className="small mt-1">
                      {initialSkills.map((s) => {
                        const sk = availableSkills.find((x) => Number(x.id) === Number(s.skillId))
                        return (
                          <span key={s.skillId} className="me-2">
                            {sk?.name || s.skillId} ({s.level}){' '}
                            <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => removeInitialSkill(s.skillId)}>
                              x
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="small mt-1 text-danger">At least one skill is required.</div>
                  )}
                </label>

                <label>
                  Add certification
                  <div className="input-inline">
                    <input value={certTitle} onChange={(e) => setCertTitle(e.target.value)} placeholder="Certification title" />
                    <input value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} placeholder="Issuer (optional)" />
                    <button type="button" className="btn btn--ghost input-inline__btn" onClick={addInitialCertification}>
                      Add
                    </button>
                  </div>
                  {initialCertifications.length > 0 ? (
                    <div className="small mt-1">
                      {initialCertifications.map((c, idx) => (
                        <span key={idx} className="me-2">
                          {c.title}
                          {c.issuer ? ` · ${c.issuer}` : ''}{' '}
                          <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => removeInitialCertification(idx)}>
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </label>
              </div>

              <label className="auth-checkbox register-staff-attest register-ai-attest">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  I confirm the information is accurate, I am joining as an <strong>employee</strong> for competency and skill tracking, and I understand my{' '}
                  <strong>job role</strong> drives required-skill and gap analysis in AI-CSGTS. HR or administrators may verify or adjust my profile per
                  organizational policy.
                </span>
              </label>
            </fieldset>
          )}

          {!optionsLoaded && (
            <button type="button" className="btn btn--ghost register-ai-retry" onClick={loadOptions} disabled={loadingOptions}>
              {loadingOptions ? 'Retrying…' : 'Retry loading options'}
            </button>
          )}

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div className="register-ai-actions">
            {step > 1 && (
              <button type="button" className="btn btn--ghost register-ai-btn-back" onClick={goBack} disabled={loading}>
                Back
              </button>
            )}
            {step < MAX_STEP && (
              <button type="button" className="btn auth-submit register-ai-btn-next" onClick={goNext} disabled={loading || !optionsLoaded}>
                Continue
              </button>
            )}
            {step === MAX_STEP && (
              <button className="btn auth-submit register-ai-btn-submit" type="submit" disabled={loading || !optionsLoaded}>
                {loading ? 'Creating account…' : 'Create employee account'}
              </button>
            )}
          </div>

          <div className="muted register-ai-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

import React, { useState } from 'react'

/**
 * Maps the AI-CSGTS product brief (modules 1–11) to what this codebase implements vs roadmap.
 * Embedded on each role dashboard so stakeholders see coverage at a glance.
 */
const MODULES = [
  {
    title: 'User & role management',
    inRelease:
      'Admin: user directory, roles, activate/deactivate, permission matrix, CSV import/export, login history (success/fail, IP). Public registration: Manager & HR only; employees & executives via admin. System config stores integration JSON (LDAP/Jira/Asana fields as structured text — not live directory sync).',
    roadmap: 'Real LDAP/SSO bind, HR “profile approval” queue, bulk Excel.',
    roles: ['ADMIN', 'HR']
  },
  {
    title: 'Competency profile',
    inRelease:
      'Employee: identity (role, dept, job role), skill inventory with Beginner→Expert, gap-linked updates, profile completeness %, skill categories on taxonomy. Certification vault: upload/list/download/delete with optional expiry.',
    roadmap: 'Project timeline, peer/manager endorsements, SFIA/ITIL import packs, automated expiry alerts.',
    roles: ['EMPLOYEE', 'MANAGER', 'HR']
  },
  {
    title: 'Skill gap analysis',
    inRelease:
      'Employee: required vs current, gap rank, color status, text filter + skill category filter, CSV export, print-to-PDF via browser. Manager: team aggregates, readiness, per-person bars.',
    roadmap: 'Native PDF engine, org heat map, historical trend charts, “what-if” role changes.',
    roles: ['EMPLOYEE', 'MANAGER', 'HR']
  },
  {
    title: 'AI analytics',
    inRelease:
      'Rule-based training recommendations from gaps; career suggestion strings; manager readiness index; executive org readiness %. Employee “AI insights”: heuristics plus optional OpenAI-compatible coaching when OPENAI_API_KEY is set. HR job-description NLP: local n-grams + extractive summary + taxonomy match, merged with optional LLM structured extract.',
    roadmap: 'Dedicated fine-tuned models, skill-decay prediction, demand forecasting, live external labor-market feeds.',
    roles: ['EMPLOYEE', 'MANAGER', 'HR', 'EXECUTIVE', 'ADMIN']
  },
  {
    title: 'Training recommendations',
    inRelease:
      'Employee: matched programs by gap with provider + delivery format (online / in-person / hybrid / certification) and format filter. HR: programs, assign, approve/reject. Manager: pending approval queue.',
    roadmap: 'LMS integrations (Coursera/Udemy), ROI fields, mandatory-training compliance dashboard.',
    roles: ['EMPLOYEE', 'MANAGER', 'HR']
  },
  {
    title: 'Project resource allocation',
    inRelease:
      'Manager: project list, dept assignee counts, auto-allocate best-fit by gap score, drag-and-drop roster order with persist. Integration URLs/tokens captured in admin config JSON (no Jira/Asana API sync).',
    roadmap: 'Project CRUD UI, calendar, live Jira/Asana assignment sync, conflict/overallocation detection.',
    roles: ['MANAGER', 'ADMIN']
  },
  {
    title: 'Reporting & dashboards',
    inRelease:
      'Role-specific dashboards (Employee / Manager / HR / Executive / Admin), KPIs, charts, audit snippets on admin overview. Admin: downloadable skill-health PPTX; optional scheduled job stub + recipient email in config (email delivery not production-grade).',
    roadmap: 'Custom report builder, full SMTP scheduling, deep BI connectors.',
    roles: ['EMPLOYEE', 'MANAGER', 'HR', 'EXECUTIVE', 'ADMIN']
  },
  {
    title: 'Audit & history',
    inRelease:
      'Admin: searchable audit log, recent timeline; actions logged for admin/HR/manager mutations. Compliance pack ZIP export (CSV snapshots + manifest — not legal-grade immutable chain of custody).',
    roadmap: 'WORM storage, profile version diff, per-user activity timeline, signed archives.',
    roles: ['ADMIN', 'HR']
  },
  {
    title: 'Employee self-service',
    inRelease:
      'Workspace with gaps, skills, training recs, certifications, manager assessment visibility, heuristic AI card, activity; responsive layout via dashboard shell.',
    roadmap: 'Career path explorer UI, goals & IDP forms, calendar hooks, mobile-first polish.',
    roles: ['EMPLOYEE']
  },
  {
    title: 'Manager & HR portal',
    inRelease:
      'Manager: team roster, insights, approvals, staffing with DnD order, per-employee skill assessments. HR: employees, taxonomy, training workflows, job description text + NLP helper, succession list by role. Executive: read-only succession accordion.',
    roadmap: 'Full talent pipeline UX, training budget, HRIS connectors.',
    roles: ['MANAGER', 'HR', 'EXECUTIVE']
  },
  {
    title: 'Admin & configuration',
    inRelease:
      'Departments, system config (gap thresholds, integrations JSON, scheduled reporting flags), permissions CRUD, import/export, stats overview; PPTX + compliance ZIP downloads from System.',
    roadmap: 'Live integration health checks, automated backups UI, deep usage analytics.',
    roles: ['ADMIN']
  }
]

function roleLabel(r) {
  if (r === 'EMPLOYEE') return 'Employee'
  if (r === 'MANAGER') return 'Manager'
  if (r === 'HR') return 'HR'
  if (r === 'ADMIN') return 'Administrator'
  if (r === 'EXECUTIVE') return 'Executive'
  return r
}

export default function CsgtsModuleMap({ role = 'EMPLOYEE' }) {
  const [open, setOpen] = useState(true)

  return (
    <section className="csgts-map card border shadow-sm mt-3 mb-2" aria-labelledby="csgts-map-title">
      <div className="card-header bg-body-secondary d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
        <div>
          <h2 id="csgts-map-title" className="h6 mb-0">
            <i className="bi bi-diagram-3-fill me-2 text-primary" aria-hidden />
            AI-CSGTS specification coverage
          </h2>
          <p className="small text-body-secondary mb-0 mt-1">
            How this build maps to the 11 UI modules — <strong>{roleLabel(role)}</strong> view. “In this release” is what you can use
            today; “Roadmap” is not yet in the MVP.
          </p>
        </div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {open && (
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0 csgts-map__table">
              <thead className="table-light">
                <tr>
                  <th scope="col" style={{ minWidth: '11rem' }}>
                    Module
                  </th>
                  <th scope="col">In this release</th>
                  <th scope="col">Roadmap / not in MVP</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m) => {
                  const focus = m.roles.includes(role)
                  return (
                    <tr key={m.title} className={focus ? 'csgts-map__row--focus' : ''}>
                      <td>
                        <span className="fw-semibold">{m.title}</span>
                        {focus && (
                          <span className="badge text-bg-primary ms-1 align-middle" title="Primary relevance for your role">
                            Your scope
                          </span>
                        )}
                      </td>
                      <td className="small text-body-secondary">{m.inRelease}</td>
                      <td className="small text-body-secondary">{m.roadmap}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

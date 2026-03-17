## UI/UX blueprint (enterprise-style)

### Design system (tokens)

- **Palette**:
  - Primary: Blue → Purple gradient accents
  - Background: Off-white + subtle glass panels
  - Semantic: Success (green), Warning (amber), Danger (red)
- **Layout**:
  - Left **sidebar** (collapsible) + top **header** (search, notifications, profile)
  - Content area: cards, data tables, filters, charts
- **Components**:
  - DataTable with column picker, saved views, bulk actions
  - FilterBar (chips + advanced filter drawer)
  - KPI cards + trend indicators
  - Stepper workflow for approvals/imports
  - Toast notifications + inline validation

### Navigation (proposed)

- **Common**
  - Dashboard
  - Directory (search employees)
  - Competency Profile
  - Skill Gap Analysis
  - Training
  - Projects & Allocation
  - Reports
  - Audit & History
  - Admin (role-based)

### Role-based dashboards (what each sees)

- **Employee**
  - Profile completeness, skills radar, endorsements, training plan, recommended next skills
  - Notifications: manager feedback, expiring certifications, assigned trainings

- **Manager**
  - Team heatmap (skills vs target), pending approvals (assessments), team gaps by project
  - Allocation board: match team members to project requirements

- **HR Admin**
  - Workforce competency overview, gap severity by department, training ROI, approvals queue
  - Taxonomy management (skills, categories)

- **System Admin**
  - Tenants, roles/permissions templates, integrations, system health, audit overview

### Wireframes (ASCII)

#### App shell

```
┌──────────────────────────────────────────────────────────────────────┐
│  AI-CSGTS        [Global Search…]      🔔  ?   (User Menu)           │
├───────────────┬──────────────────────────────────────────────────────┤
│ Sidebar       │  Page Title                             [Actions]    │
│ - Dashboard   │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ - Directory   │  │ KPI Card  │ │ KPI Card  │ │ KPI Card  │           │
│ - Profiles    │  └──────────┘ └──────────┘ └──────────┘             │
│ - Gaps        │  ┌──────────────────────── Charts ─────────────────┐ │
│ - Training    │  │                                                 │ │
│ - Projects    │  └─────────────────────────────────────────────────┘ │
│ - Reports     │  ┌──────────────────── Data Table ─────────────────┐ │
│ - Audit       │  │ Filters | Bulk actions | Export                  │ │
│ - Admin*      │  └─────────────────────────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────────────┘
```

#### Skill gap analysis (employee)

```
Employee: Jane Doe      Scope: Role (Senior Backend)   [Export PDF] [Export Excel]

Skills Required vs Current:
┌───────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Skill                 │ Required │ Current  │ Gap      │ Status   │
├───────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Node.js               │ Advanced │ Advanced │ 0        │ Green    │
│ System Design         │ Expert   │ Advanced │ -1       │ Yellow   │
│ Kubernetes            │ Advanced │ Beginner │ -2       │ Red      │
└───────────────────────┴──────────┴──────────┴──────────┴──────────┘

Severity score: 72/100 (High)
Recommendations:
- Training: "Kubernetes for Developers" (Confidence 0.86)
- Project: Shadow on "Platform Migration" (Confidence 0.64)
```

#### Project allocation (manager)

```
Project: Phoenix Revamp     Timeline: Apr–Jun     [AI Match] [Save]

Requirements: React(Adv) x2 | Node(Adv) x1 | QA(Inter) x1

Candidates (AI-ranked)        Assignment Board (drag-drop)
┌─────────────────────────┐   ┌──────────────────────────────┐
│ A. Kim   92% fit        │   │ React(Adv) Slot #1:  [____]  │
│ J. Doe   88% fit        │   │ React(Adv) Slot #2:  [____]  │
│ S. Rana  77% fit        │   │ Node(Adv) Slot:      [____]  │
│ ...                     │   │ QA(Inter) Slot:      [____]  │
└─────────────────────────┘   └──────────────────────────────┘

Conflicts: J. Doe overloaded (2 projects) → suggestion: swap with S. Rana
```

### UX behaviors (key)

- **Saved views** for tables (filters/sorts persisted per user)
- **Inline approvals** (HR approval, manager assessments) with audit trail
- **Explainable AI**: each recommendation shows top contributing factors
- **Accessibility**: keyboard navigation, color-safe status indicators


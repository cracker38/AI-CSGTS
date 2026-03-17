# AI-CSGTS

## AI-Powered Competency & Skill Gap Tracking System (AI-CSGTS)

Enterprise SaaS platform for IT organizations to assess employee competencies, identify skill gaps, and drive workforce development using AI.

### Monorepo layout

- `apps/web`: Next.js (React) + Tailwind UI
- `apps/api`: Node.js (TypeScript) REST API (RBAC, workflows, reporting)
- `apps/ai`: Python FastAPI AI microservice (recommendations, NLP extraction)
- `packages/shared`: Shared types/schemas (future)
- `docs`: Architecture, ERD, API notes

### Quick start (local)

Prereqs: Node.js LTS, Python 3.11+, Docker Desktop (recommended), MySQL or Postgres.

1. Start database (Docker recommended)
2. Run API + AI + Web in dev mode

Docs: see `docs/ARCHITECTURE.md` and `docs/ERD.md`.


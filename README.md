# AI-CSGTS (AI-Powered Competency & Skill Gap Tracking System)

This is a modular full-stack MVP using:
- Backend: **Java Spring Boot 3** (REST + JWT + role-based access)
- Database: **MySQL**
- Frontend: **React** (role-specific dashboards)

## 1) MySQL setup

1. Create database:
   ```sql
   CREATE DATABASE ai_csgts;
   ```
2. Run schema:
   - `backend/src/main/resources/db/schema.sql`

## 2) Backend setup

1. Edit `backend/src/main/resources/application.yml`
   - `spring.datasource.username`
   - `spring.datasource.password`
   - `app.jwt.secret` (change the default)
2. Run the backend:
   - `mvn spring-boot:run`
3. Backend runs on:
   - `http://localhost:8080`

## 3) Frontend setup

1. Install dependencies:
   - `cd frontend && npm install`
2. Run dev server:
   - `npm run dev`
3. Frontend runs on:
   - `http://localhost:5173`

Optional: set `VITE_API_BASE_URL` in `frontend/.env` to point to your backend.

## 4) Login credentials (bootstrap)

On first backend start, a default admin is bootstrapped:
- Email: `admin@aicsgts.local`
- Password: `Admin123!`

Employees must self-register via:
- `POST /api/auth/register`

## 5) Core API endpoints (MVP)

### Authentication
- `POST /api/auth/register` (self-registers as `EMPLOYEE`)
- `POST /api/auth/login`
- `GET /api/auth/me`

### Employee
- `GET /api/employee/dashboard`
- `GET /api/employee/skills`
- `POST /api/employee/skills` (upsert by `skillId`)
- `DELETE /api/employee/skills/{skillId}`

### Manager
- `GET /api/manager/dashboard`
- `POST /api/manager/projects/{projectId}/auto-allocate`

### HR
- `GET /api/hr/employees`
- `PATCH /api/hr/employees/{id}/activate`
- `GET/POST /api/hr/skills`
- `GET/POST /api/hr/job-roles`
- `POST /api/hr/job-roles/{jobRoleId}/required-skills`
- `GET /api/hr/job-roles/{jobRoleId}/required-skills`
- `GET/POST /api/hr/training-programs`
- `POST /api/hr/training-assignments`
- `POST /api/hr/training-assignments/{id}/approve`
- `POST /api/hr/training-assignments/{id}/reject`

### Admin
- `POST /api/admin/users` (creates `MANAGER`/`HR`/`ADMIN` only; `EMPLOYEE` rejected)
- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}/activate`
- `POST/GET /api/admin/departments`
- `GET/PATCH /api/admin/config`
- `GET /api/admin/audit/recent`
- `POST /api/admin/users/import` (CSV upload scaffold)
- `GET/POST /api/admin/permissions`
- `GET/POST /api/admin/role-permissions/{role}` (assign permissions per role)

## Notes / Next Improvements
- Add full project creation + assignment UI.
- Expand the approval workflow (Manager review separate from HR approval).
- Add CRUD for training assignments/projects with richer validation.


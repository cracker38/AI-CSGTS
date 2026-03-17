-- AI-CSGTS relational schema (tenant-aware)
-- Target DB: MySQL 8+ (works similarly in Postgres with minor type changes)

CREATE TABLE tenants (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  department VARCHAR(200) NULL,
  title VARCHAR(200) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|ACTIVE|SUSPENDED
  approved_at TIMESTAMP NULL,
  approved_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_tenant_email (tenant_id, email),
  KEY idx_users_tenant_status (tenant_id, status),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE roles (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_tenant_name (tenant_id, name),
  CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE user_roles (
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE skills (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(200) NULL,
  description TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_skills_tenant_name (tenant_id, name),
  KEY idx_skills_tenant_category (tenant_id, category),
  CONSTRAINT fk_skills_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE employee_skills (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  skill_id CHAR(36) NOT NULL,
  level VARCHAR(20) NOT NULL, -- BEGINNER|INTERMEDIATE|ADVANCED|EXPERT
  self_score INT NULL,
  manager_score INT NULL,
  endorsements_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_emp_skills (tenant_id, user_id, skill_id),
  KEY idx_emp_skills_tenant_user (tenant_id, user_id),
  CONSTRAINT fk_emp_skills_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_emp_skills_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_emp_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE certifications (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  issuer VARCHAR(200) NULL,
  issued_on DATE NULL,
  expires_on DATE NULL,
  file_url VARCHAR(500) NULL,
  KEY idx_cert_tenant_user (tenant_id, user_id),
  CONSTRAINT fk_cert_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_cert_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE experience_timeline (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  org VARCHAR(200) NOT NULL,
  role VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  summary TEXT NULL,
  KEY idx_exp_tenant_user (tenant_id, user_id),
  CONSTRAINT fk_exp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_exp_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE projects (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
  start_date DATE NULL,
  end_date DATE NULL,
  UNIQUE KEY uq_projects_tenant_code (tenant_id, code),
  KEY idx_projects_tenant_status (tenant_id, status),
  CONSTRAINT fk_projects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE project_requirements (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  project_id CHAR(36) NOT NULL,
  skill_id CHAR(36) NOT NULL,
  required_level VARCHAR(20) NOT NULL,
  required_headcount INT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_project_req (tenant_id, project_id, skill_id),
  CONSTRAINT fk_proj_req_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_proj_req_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_proj_req_skill FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE training_programs (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- Internal|Coursera|Udemy|Other
  url VARCHAR(500) NULL,
  duration_hours INT NULL,
  cost DECIMAL(12,2) NULL,
  skills_covered_json JSON NULL,
  KEY idx_training_tenant_provider (tenant_id, provider),
  CONSTRAINT fk_training_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE enrollments (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  training_program_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED', -- PLANNED|IN_PROGRESS|COMPLETED|DROPPED
  progress_percent INT NOT NULL DEFAULT 0,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  KEY idx_enroll_tenant_user (tenant_id, user_id),
  CONSTRAINT fk_enroll_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_enroll_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_enroll_training FOREIGN KEY (training_program_id) REFERENCES training_programs(id)
);

CREATE TABLE gap_analysis_snapshots (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  scope_type VARCHAR(20) NOT NULL, -- ROLE|PROJECT
  scope_id CHAR(36) NOT NULL,
  severity_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  result_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_gap_tenant_user_created (tenant_id, user_id, created_at),
  CONSTRAINT fk_gap_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_gap_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE recommendations (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(30) NOT NULL, -- TRAINING|SKILL|PROJECT
  payload_json JSON NOT NULL,
  confidence DECIMAL(4,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rec_tenant_user_created (tenant_id, user_id, created_at),
  CONSTRAINT fk_rec_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_rec_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE login_history (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  ip VARCHAR(100) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_login_tenant_user_created (tenant_id, user_id, created_at),
  CONSTRAINT fk_login_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_login_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE activity_logs (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id CHAR(36) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activity_tenant_user_created (tenant_id, user_id, created_at),
  CONSTRAINT fk_activity_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  actor_user_id CHAR(36) NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id CHAR(36) NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_tenant_created (tenant_id, created_at),
  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);


-- MySQL schema for AI-Powered Competency & Skill Gap Tracking System (AI-CSGTS)
-- Run after creating the database: CREATE DATABASE ai_csgts;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS project_assignments;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS training_assignments;
DROP TABLE IF EXISTS training_programs;
DROP TABLE IF EXISTS required_skills;
DROP TABLE IF EXISTS employee_skills;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS job_roles;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS departments;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;

CREATE TABLE departments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skills (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  active BIT NOT NULL DEFAULT 1,
  department_id BIGINT NULL,
  job_role_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id),
  CONSTRAINT fk_users_job_role FOREIGN KEY (job_role_id) REFERENCES job_roles(id)
);

CREATE TABLE employee_skills (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  skill_id BIGINT NOT NULL,
  level VARCHAR(32) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_employee_skill UNIQUE (employee_id, skill_id),
  CONSTRAINT fk_employee_skills_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  CONSTRAINT fk_employee_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE required_skills (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_role_id BIGINT NOT NULL,
  skill_id BIGINT NOT NULL,
  required_level VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_required_skill UNIQUE (job_role_id, skill_id),
  CONSTRAINT fk_required_skills_job_role FOREIGN KEY (job_role_id) REFERENCES job_roles(id),
  CONSTRAINT fk_required_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE training_programs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(2000) NULL,
  skill_id BIGINT NOT NULL,
  target_level VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_training_programs_skill FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE training_assignments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  program_id BIGINT NOT NULL,
  employee_id BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by_user_id BIGINT NULL,
  review_note VARCHAR(1000) NULL,
  CONSTRAINT fk_training_assignments_program FOREIGN KEY (program_id) REFERENCES training_programs(id),
  CONSTRAINT fk_training_assignments_employee FOREIGN KEY (employee_id) REFERENCES users(id),
  CONSTRAINT fk_training_assignments_reviewed_by FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
);

CREATE TABLE projects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  required_job_role_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_required_job_role FOREIGN KEY (required_job_role_id) REFERENCES job_roles(id)
);

CREATE TABLE project_assignments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  employee_id BIGINT NOT NULL,
  assigned_role VARCHAR(255) NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_assignments_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_project_assignments_employee FOREIGN KEY (employee_id) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT NULL,
  action VARCHAR(255) NOT NULL,
  details VARCHAR(4000) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE TABLE permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  description VARCHAR(1000) NULL,
  CONSTRAINT uq_permissions_code UNIQUE (code)
);

CREATE TABLE role_permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(32) NOT NULL,
  permission_id BIGINT NOT NULL,
  CONSTRAINT uq_role_permission UNIQUE (role, permission_id),
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE system_config (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  gap_alert_rank INT NOT NULL DEFAULT 2
);


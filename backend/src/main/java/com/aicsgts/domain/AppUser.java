package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "users", uniqueConstraints = {
  @UniqueConstraint(name = "uq_users_email", columnNames = "email")
})
public class AppUser {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  @Column(nullable = false)
  private String email;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Role role;

  private boolean active = true;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "department_id")
  private Department department;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "job_role_id")
  private JobRole jobRole;

  @Column(columnDefinition = "LONGTEXT")
  private String cvText;

  @Column(length = 500)
  private String cvFileName;

  @Column(length = 1000)
  private String cvStoragePath;

  @Column(length = 2000)
  private String careerGoalsText;

  private Instant cvUpdatedAt;

  private Instant createdAt = Instant.now();

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public Role getRole() {
    return role;
  }

  public void setRole(Role role) {
    this.role = role;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public Department getDepartment() {
    return department;
  }

  public void setDepartment(Department department) {
    this.department = department;
  }

  public JobRole getJobRole() {
    return jobRole;
  }

  public void setJobRole(JobRole jobRole) {
    this.jobRole = jobRole;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public String getCvText() {
    return cvText;
  }

  public void setCvText(String cvText) {
    this.cvText = cvText;
  }

  public String getCvFileName() {
    return cvFileName;
  }

  public void setCvFileName(String cvFileName) {
    this.cvFileName = cvFileName;
  }

  public String getCvStoragePath() {
    return cvStoragePath;
  }

  public void setCvStoragePath(String cvStoragePath) {
    this.cvStoragePath = cvStoragePath;
  }

  public String getCareerGoalsText() {
    return careerGoalsText;
  }

  public void setCareerGoalsText(String careerGoalsText) {
    this.careerGoalsText = careerGoalsText;
  }

  public Instant getCvUpdatedAt() {
    return cvUpdatedAt;
  }

  public void setCvUpdatedAt(Instant cvUpdatedAt) {
    this.cvUpdatedAt = cvUpdatedAt;
  }
}


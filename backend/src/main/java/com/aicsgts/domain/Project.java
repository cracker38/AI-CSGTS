package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "projects")
public class Project {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "required_job_role_id")
  private JobRole requiredJobRole;

  @Column(name = "deadline_at")
  private Instant deadlineAt;

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

  public JobRole getRequiredJobRole() {
    return requiredJobRole;
  }

  public void setRequiredJobRole(JobRole requiredJobRole) {
    this.requiredJobRole = requiredJobRole;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getDeadlineAt() {
    return deadlineAt;
  }

  public void setDeadlineAt(Instant deadlineAt) {
    this.deadlineAt = deadlineAt;
  }
}


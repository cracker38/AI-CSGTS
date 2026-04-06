package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(
  name = "required_skills",
  uniqueConstraints = {
    @UniqueConstraint(name = "uq_required_skill", columnNames = {"job_role_id", "skill_id"})
  }
)
public class RequiredSkill {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "job_role_id", nullable = false)
  private JobRole jobRole;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "skill_id", nullable = false)
  private Skill skill;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SkillLevel requiredLevel;

  private Instant createdAt = Instant.now();

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public JobRole getJobRole() {
    return jobRole;
  }

  public void setJobRole(JobRole jobRole) {
    this.jobRole = jobRole;
  }

  public Skill getSkill() {
    return skill;
  }

  public void setSkill(Skill skill) {
    this.skill = skill;
  }

  public SkillLevel getRequiredLevel() {
    return requiredLevel;
  }

  public void setRequiredLevel(SkillLevel requiredLevel) {
    this.requiredLevel = requiredLevel;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}


package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "manager_skill_assessments")
public class ManagerSkillAssessment {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "manager_id", nullable = false)
  private AppUser manager;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "employee_id", nullable = false)
  private AppUser employee;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "skill_id", nullable = false)
  private Skill skill;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SkillLevel assessedLevel;

  @Column(length = 2000)
  private String note;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public AppUser getManager() {
    return manager;
  }

  public void setManager(AppUser manager) {
    this.manager = manager;
  }

  public AppUser getEmployee() {
    return employee;
  }

  public void setEmployee(AppUser employee) {
    this.employee = employee;
  }

  public Skill getSkill() {
    return skill;
  }

  public void setSkill(Skill skill) {
    this.skill = skill;
  }

  public SkillLevel getAssessedLevel() {
    return assessedLevel;
  }

  public void setAssessedLevel(SkillLevel assessedLevel) {
    this.assessedLevel = assessedLevel;
  }

  public String getNote() {
    return note;
  }

  public void setNote(String note) {
    this.note = note;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}

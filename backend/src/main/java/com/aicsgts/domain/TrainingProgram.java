package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "training_programs")
public class TrainingProgram {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String title;

  @Column(length = 2000)
  private String description;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "skill_id", nullable = false)
  private Skill skill;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SkillLevel targetLevel;

  private Instant createdAt = Instant.now();

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Skill getSkill() {
    return skill;
  }

  public void setSkill(Skill skill) {
    this.skill = skill;
  }

  public SkillLevel getTargetLevel() {
    return targetLevel;
  }

  public void setTargetLevel(SkillLevel targetLevel) {
    this.targetLevel = targetLevel;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}


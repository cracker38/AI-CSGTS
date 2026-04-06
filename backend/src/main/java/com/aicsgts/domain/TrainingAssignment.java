package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "training_assignments")
public class TrainingAssignment {

  public enum Status {
    REQUESTED,
    APPROVED,
    REJECTED,
    COMPLETED
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "program_id", nullable = false)
  private TrainingProgram program;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "employee_id", nullable = false)
  private AppUser employee;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Status status = Status.REQUESTED;

  private Instant requestedAt = Instant.now();
  private Instant reviewedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reviewed_by_user_id")
  private AppUser reviewedBy;

  @Column(length = 1000)
  private String reviewNote;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public TrainingProgram getProgram() {
    return program;
  }

  public void setProgram(TrainingProgram program) {
    this.program = program;
  }

  public AppUser getEmployee() {
    return employee;
  }

  public void setEmployee(AppUser employee) {
    this.employee = employee;
  }

  public Status getStatus() {
    return status;
  }

  public void setStatus(Status status) {
    this.status = status;
  }

  public Instant getRequestedAt() {
    return requestedAt;
  }

  public void setRequestedAt(Instant requestedAt) {
    this.requestedAt = requestedAt;
  }

  public Instant getReviewedAt() {
    return reviewedAt;
  }

  public void setReviewedAt(Instant reviewedAt) {
    this.reviewedAt = reviewedAt;
  }

  public AppUser getReviewedBy() {
    return reviewedBy;
  }

  public void setReviewedBy(AppUser reviewedBy) {
    this.reviewedBy = reviewedBy;
  }

  public String getReviewNote() {
    return reviewNote;
  }

  public void setReviewNote(String reviewNote) {
    this.reviewNote = reviewNote;
  }
}


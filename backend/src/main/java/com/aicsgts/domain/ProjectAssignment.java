package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "project_assignments")
public class ProjectAssignment {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "project_id", nullable = false)
  private Project project;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "employee_id", nullable = false)
  private AppUser employee;

  private String assignedRole;

  /** Order within the project roster (drag-and-drop staffing). */
  @Column(nullable = false)
  private int position = 0;

  private Instant assignedAt = Instant.now();

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Project getProject() {
    return project;
  }

  public void setProject(Project project) {
    this.project = project;
  }

  public AppUser getEmployee() {
    return employee;
  }

  public void setEmployee(AppUser employee) {
    this.employee = employee;
  }

  public String getAssignedRole() {
    return assignedRole;
  }

  public void setAssignedRole(String assignedRole) {
    this.assignedRole = assignedRole;
  }

  public int getPosition() {
    return position;
  }

  public void setPosition(int position) {
    this.position = position;
  }

  public Instant getAssignedAt() {
    return assignedAt;
  }

  public void setAssignedAt(Instant assignedAt) {
    this.assignedAt = assignedAt;
  }
}


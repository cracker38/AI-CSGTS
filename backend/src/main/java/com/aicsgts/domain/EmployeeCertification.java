package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "employee_certifications")
public class EmployeeCertification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "employee_id", nullable = false)
  private AppUser employee;

  @Column(nullable = false, length = 500)
  private String title;

  @Column(length = 500)
  private String issuer;

  private Instant expiresAt;

  @Column(nullable = false, length = 500)
  private String fileName;

  @Column(length = 200)
  private String contentType;

  @Column(nullable = false, length = 1000)
  private String storagePath;

  private long fileSize;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public AppUser getEmployee() {
    return employee;
  }

  public void setEmployee(AppUser employee) {
    this.employee = employee;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getIssuer() {
    return issuer;
  }

  public void setIssuer(String issuer) {
    this.issuer = issuer;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }

  public String getContentType() {
    return contentType;
  }

  public void setContentType(String contentType) {
    this.contentType = contentType;
  }

  public String getStoragePath() {
    return storagePath;
  }

  public void setStoragePath(String storagePath) {
    this.storagePath = storagePath;
  }

  public long getFileSize() {
    return fileSize;
  }

  public void setFileSize(long fileSize) {
    this.fileSize = fileSize;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}

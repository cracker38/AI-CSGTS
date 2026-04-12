package com.aicsgts.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "login_events")
public class LoginEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private AppUser user;

  /** Email from the login attempt (useful when success is false). */
  @Column(name = "email_attempt")
  private String emailAttempt;

  @Column(nullable = false)
  private boolean success;

  @Column(name = "ip_address", length = 64)
  private String ipAddress;

  @Column(name = "user_agent", length = 512)
  private String userAgent;

  @Column(nullable = false)
  private Instant createdAt = Instant.now();

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public AppUser getUser() {
    return user;
  }

  public void setUser(AppUser user) {
    this.user = user;
  }

  public String getEmailAttempt() {
    return emailAttempt;
  }

  public void setEmailAttempt(String emailAttempt) {
    this.emailAttempt = emailAttempt;
  }

  public boolean isSuccess() {
    return success;
  }

  public void setSuccess(boolean success) {
    this.success = success;
  }

  public String getIpAddress() {
    return ipAddress;
  }

  public void setIpAddress(String ipAddress) {
    this.ipAddress = ipAddress;
  }

  public String getUserAgent() {
    return userAgent;
  }

  public void setUserAgent(String userAgent) {
    this.userAgent = userAgent;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }
}

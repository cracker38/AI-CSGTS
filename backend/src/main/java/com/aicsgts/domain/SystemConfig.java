package com.aicsgts.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "system_config")
public class SystemConfig {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // If the computed gap rank is >= this value, trigger an alert/priority training recommendation.
  private int gapAlertRank = 2;

  /** JSON: ldapEnabled, ldapServerUrl, ssoNotes, jiraBaseUrl, jiraApiTokenSet, asanaWorkspaceId, etc. */
  @Lob
  @Column(columnDefinition = "LONGTEXT")
  private String integrationsJson;

  private boolean scheduledReportingEnabled;

  @Column(length = 320)
  private String reportingRecipientEmail;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public int getGapAlertRank() {
    return gapAlertRank;
  }

  public void setGapAlertRank(int gapAlertRank) {
    this.gapAlertRank = gapAlertRank;
  }

  public String getIntegrationsJson() {
    return integrationsJson;
  }

  public void setIntegrationsJson(String integrationsJson) {
    this.integrationsJson = integrationsJson;
  }

  public boolean isScheduledReportingEnabled() {
    return scheduledReportingEnabled;
  }

  public void setScheduledReportingEnabled(boolean scheduledReportingEnabled) {
    this.scheduledReportingEnabled = scheduledReportingEnabled;
  }

  public String getReportingRecipientEmail() {
    return reportingRecipientEmail;
  }

  public void setReportingRecipientEmail(String reportingRecipientEmail) {
    this.reportingRecipientEmail = reportingRecipientEmail;
  }
}


package com.aicsgts.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "system_config")
public class SystemConfig {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // If the computed gap rank is >= this value, trigger an alert/priority training recommendation.
  private int gapAlertRank = 2;

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
}


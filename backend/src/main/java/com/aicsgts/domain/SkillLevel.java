package com.aicsgts.domain;

public enum SkillLevel {
  BEGINNER(0),
  INTERMEDIATE(1),
  ADVANCED(2),
  EXPERT(3);

  private final int rank;

  SkillLevel(int rank) {
    this.rank = rank;
  }

  public int rank() {
    return rank;
  }

  public static SkillLevel fromRank(int rank) {
    if (rank <= 0) return BEGINNER;
    if (rank == 1) return INTERMEDIATE;
    if (rank == 2) return ADVANCED;
    return EXPERT;
  }
}


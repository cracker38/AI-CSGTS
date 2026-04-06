package com.aicsgts.service;

import com.aicsgts.domain.*;
import com.aicsgts.repo.EmployeeSkillRepository;
import com.aicsgts.repo.RequiredSkillRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SkillGapService {

  public record SkillGapItem(
      Long skillId,
      String skillName,
      SkillLevel requiredLevel,
      SkillLevel currentLevel,
      int gapRank,
      String color // GREEN/YELLOW/ORANGE/RED
  ) {
  }

  public record SkillGapSummary(
      List<SkillGapItem> gaps,
      int greenCount,
      int yellowCount,
      int orangeCount,
      int redCount
  ) {
  }

  @Transactional(readOnly = true)
  public SkillGapSummary computeForEmployee(
      AppUser employee,
      List<RequiredSkill> requiredSkills,
      List<EmployeeSkill> currentSkills
  ) {
    Map<Long, EmployeeSkill> bySkillId = currentSkills.stream()
        .collect(Collectors.toMap(es -> es.getSkill().getId(), es -> es, (a, b) -> a));

    List<SkillGapItem> gaps = new ArrayList<>();
    int green = 0, yellow = 0, orange = 0, red = 0;

    for (RequiredSkill req : requiredSkills) {
      SkillLevel required = req.getRequiredLevel();
      EmployeeSkill cur = bySkillId.get(req.getSkill().getId());

      if (cur == null) {
        // Missing skill => worst gap.
        int gapRank = required.rank() + 1;
        gaps.add(new SkillGapItem(
            req.getSkill().getId(),
            req.getSkill().getName(),
            required,
            SkillLevel.BEGINNER,
            gapRank,
            "RED"
        ));
        red++;
        continue;
      }

      SkillLevel current = cur.getLevel();
      int diff = required.rank() - current.rank();
      int gapRank = Math.max(0, diff);

      String color;
      if (diff <= 0) {
        color = "GREEN";
        green++;
      } else if (diff == 1) {
        color = "YELLOW";
        yellow++;
      } else if (diff == 2) {
        color = "ORANGE";
        orange++;
      } else {
        color = "RED";
        red++;
      }

      gaps.add(new SkillGapItem(
          req.getSkill().getId(),
          req.getSkill().getName(),
          required,
          current,
          gapRank,
          color
      ));
    }

    return new SkillGapSummary(gaps, green, yellow, orange, red);
  }

  @Transactional(readOnly = true)
  public SkillGapSummary computeForEmployee(AppUser employee) {
    if (employee.getJobRole() == null) {
      return new SkillGapSummary(Collections.emptyList(), 0, 0, 0, 0);
    }
    // In this MVP we keep these lists in-memory fetched by controllers/services.
    return computeForEmployee(employee,
        requiredSkillsFor(employee),
        currentSkillsFor(employee)
    );
  }

  private final RequiredSkillRepository requiredSkills;
  private final EmployeeSkillRepository employeeSkills;

  public SkillGapService(RequiredSkillRepository requiredSkills, EmployeeSkillRepository employeeSkills) {
    this.requiredSkills = requiredSkills;
    this.employeeSkills = employeeSkills;
  }

  private List<RequiredSkill> requiredSkillsFor(AppUser employee) {
    return requiredSkills.findByJobRoleId(employee.getJobRole().getId());
  }

  private List<EmployeeSkill> currentSkillsFor(AppUser employee) {
    return employeeSkills.findByEmployeeId(employee.getId());
  }
}


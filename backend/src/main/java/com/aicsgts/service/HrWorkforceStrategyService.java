package com.aicsgts.service;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Project;
import com.aicsgts.domain.RequiredSkill;
import com.aicsgts.domain.Role;
import com.aicsgts.domain.SkillLevel;
import com.aicsgts.domain.TrainingAssignment;
import com.aicsgts.domain.TrainingDeliveryFormat;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.EmployeeSkillRepository;
import com.aicsgts.repo.ProjectRepository;
import com.aicsgts.repo.RequiredSkillRepository;
import com.aicsgts.repo.TrainingAssignmentRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class HrWorkforceStrategyService {

  private final AppUserRepository users;
  private final EmployeeSkillRepository employeeSkills;
  private final RequiredSkillRepository requiredSkills;
  private final TrainingAssignmentRepository trainingAssignments;
  private final ProjectRepository projects;

  public HrWorkforceStrategyService(
      AppUserRepository users,
      EmployeeSkillRepository employeeSkills,
      RequiredSkillRepository requiredSkills,
      TrainingAssignmentRepository trainingAssignments,
      ProjectRepository projects
  ) {
    this.users = users;
    this.employeeSkills = employeeSkills;
    this.requiredSkills = requiredSkills;
    this.trainingAssignments = trainingAssignments;
    this.projects = projects;
  }

  public Map<String, Object> snapshot() {
    List<AppUser> employees = users.findAll().stream().filter(u -> u.getRole() == Role.EMPLOYEE).toList();
    List<RequiredSkill> reqAll = requiredSkills.findAll();

    int health = orgSkillHealthScore(employees, reqAll);
    Map<String, Object> roi = trainingRoi(employees);
    List<Map<String, Object>> priorities = gapPriorities(employees, reqAll);
    Map<String, Object> ai = aiStrategySignals(employees, priorities);

    return Map.of(
        "organizationalSkillHealthScore", health,
        "healthFormula", "health_score = (total_matched_skills / total_required_skills) * 100",
        "trainingRoi", roi,
        "trainingRoiFormula", "ROI = (performance_improvement - training_cost) / training_cost",
        "gapPrioritization", priorities,
        "gapPrioritizationFormula", "Priority = f(business impact, skill scarcity, project dependency)",
        "aiStrategy", ai,
        "workflow", List.of("Define Roles", "Analyze Workforce", "Identify Gaps", "Plan Training", "Measure Impact"),
        "checkedAt", Instant.now()
    );
  }

  private int orgSkillHealthScore(List<AppUser> employees, List<RequiredSkill> reqAll) {
    int totalRequired = 0;
    int totalMatched = 0;
    for (AppUser emp : employees) {
      if (emp.getJobRole() == null) continue;
      List<RequiredSkill> req = reqAll.stream()
          .filter(r -> r.getJobRole().getId().equals(emp.getJobRole().getId()))
          .toList();
      if (req.isEmpty()) continue;
      Map<Long, SkillLevel> current = new HashMap<>();
      employeeSkills.findByEmployeeId(emp.getId()).forEach(es -> current.put(es.getSkill().getId(), es.getLevel()));
      for (RequiredSkill r : req) {
        totalRequired++;
        SkillLevel have = current.get(r.getSkill().getId());
        if (have != null && have.rank() >= r.getRequiredLevel().rank()) totalMatched++;
      }
    }
    if (totalRequired == 0) return 100;
    return (int) Math.round((totalMatched * 100.0) / totalRequired);
  }

  private Map<String, Object> trainingRoi(List<AppUser> employees) {
    List<TrainingAssignment> completed = trainingAssignments.findAll().stream()
        .filter(t -> t.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(t -> t.getStatus() == TrainingAssignment.Status.COMPLETED)
        .toList();
    double cost = completed.stream().mapToDouble(t -> estimatedCost(t)).sum();
    double improvement = completed.size() * 1800.0; // conservative proxy value
    double roi = cost <= 0 ? 0.0 : (improvement - cost) / cost;
    return Map.of(
        "performanceImprovement", (int) Math.round(improvement),
        "trainingCost", (int) Math.round(cost),
        "roi", round2(roi),
        "completedTrainings", completed.size()
    );
  }

  private static double estimatedCost(TrainingAssignment ta) {
    TrainingDeliveryFormat f = ta.getProgram().getDeliveryFormat();
    if (f == null) return 800;
    return switch (f) {
      case ONLINE -> 600;
      case HYBRID -> 1000;
      case IN_PERSON -> 1400;
      case CERTIFICATION -> 1800;
    };
  }

  private List<Map<String, Object>> gapPriorities(List<AppUser> employees, List<RequiredSkill> reqAll) {
    Map<Long, Integer> businessImpact = new HashMap<>();
    Map<Long, Integer> scarcity = new HashMap<>();
    Map<Long, Integer> dependency = new HashMap<>();

    Set<Long> allSkillIds = new HashSet<>();
    reqAll.forEach(r -> allSkillIds.add(r.getSkill().getId()));

    for (Long skillId : allSkillIds) {
      int impact = (int) reqAll.stream().filter(r -> r.getSkill().getId().equals(skillId)).count();
      businessImpact.put(skillId, impact);

      int available = 0;
      int required = 0;
      for (AppUser e : employees) {
        if (e.getJobRole() == null) continue;
        boolean reqForRole = reqAll.stream().anyMatch(r -> r.getJobRole().getId().equals(e.getJobRole().getId()) && r.getSkill().getId().equals(skillId));
        if (!reqForRole) continue;
        required++;
        boolean has = employeeSkills.findByEmployeeId(e.getId()).stream().anyMatch(es -> es.getSkill().getId().equals(skillId));
        if (has) available++;
      }
      int scarcityPct = required == 0 ? 0 : (int) Math.round(((required - available) * 100.0) / required);
      scarcity.put(skillId, Math.max(0, scarcityPct));

      int dep = 0;
      for (Project p : projects.findAll()) {
        if (p.getRequiredJobRole() == null) continue;
        boolean projectNeeds = reqAll.stream().anyMatch(r -> r.getJobRole().getId().equals(p.getRequiredJobRole().getId()) && r.getSkill().getId().equals(skillId));
        if (!projectNeeds) continue;
        long days = p.getDeadlineAt() == null ? 999 : ChronoUnit.DAYS.between(Instant.now(), p.getDeadlineAt());
        if (days <= 60) dep++;
      }
      dependency.put(skillId, dep);
    }

    List<Map<String, Object>> out = new ArrayList<>();
    for (RequiredSkill r : reqAll) {
      long skillId = r.getSkill().getId();
      int impact = businessImpact.getOrDefault(skillId, 0);
      int scarce = scarcity.getOrDefault(skillId, 0);
      int dep = dependency.getOrDefault(skillId, 0);
      int priorityScore = (impact * 3) + (scarce * 2) + (dep * 4);
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("skillId", skillId);
      row.put("skillName", r.getSkill().getName());
      row.put("businessImpact", impact);
      row.put("skillScarcity", scarce);
      row.put("projectDependency", dep);
      row.put("priorityScore", priorityScore);
      out.add(row);
    }
    out.sort((a, b) -> Integer.compare((Integer) b.get("priorityScore"), (Integer) a.get("priorityScore")));
    if (out.size() > 10) return out.subList(0, 10);
    return out;
  }

  private Map<String, Object> aiStrategySignals(List<AppUser> employees, List<Map<String, Object>> priorities) {
    int nearDeadlineProjects = (int) projects.findAll().stream()
        .filter(p -> p.getDeadlineAt() != null && ChronoUnit.DAYS.between(Instant.now(), p.getDeadlineAt()) <= 90)
        .count();
    int hiringNeed = Math.max(0, nearDeadlineProjects - Math.max(1, employees.size() / 4));
    String trend = priorities.isEmpty() ? "STABLE" : ((Integer) priorities.get(0).get("priorityScore")) > 50 ? "RISING" : "STEADY";
    String recommendation = hiringNeed > 2
        ? "Hire for top-priority scarce skills while running targeted upskilling for adjacent capabilities."
        : "Favor upskilling for top-priority skills; use selective hiring only for persistent bottlenecks.";
    return Map.of(
        "futureHiringNeedsNextQuarter", hiringNeed,
        "skillDemandTrend", trend,
        "upskillingVsHiringRecommendation", recommendation
    );
  }

  private static double round2(double v) {
    return Math.round(v * 100.0) / 100.0;
  }
}

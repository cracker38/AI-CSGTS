package com.aicsgts.service;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.EmployeeCertification;
import com.aicsgts.domain.EmployeeSkill;
import com.aicsgts.domain.ManagerSkillAssessment;
import com.aicsgts.domain.ProjectAssignment;
import com.aicsgts.domain.RequiredSkill;
import com.aicsgts.domain.Skill;
import com.aicsgts.domain.SkillLevel;
import com.aicsgts.domain.TrainingProgram;
import com.aicsgts.repo.EmployeeCertificationRepository;
import com.aicsgts.repo.EmployeeSkillRepository;
import com.aicsgts.repo.ManagerSkillAssessmentRepository;
import com.aicsgts.repo.ProjectAssignmentRepository;
import com.aicsgts.repo.RequiredSkillRepository;
import com.aicsgts.repo.SkillRepository;
import com.aicsgts.repo.TrainingProgramRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class EmployeeCompetencyAnalysisService {
  private final EmployeeSkillRepository employeeSkills;
  private final RequiredSkillRepository requiredSkills;
  private final EmployeeCertificationRepository certifications;
  private final ManagerSkillAssessmentRepository managerAssessments;
  private final ProjectAssignmentRepository projectAssignments;
  private final TrainingProgramRepository trainingPrograms;
  private final SkillRepository skills;

  public EmployeeCompetencyAnalysisService(
      EmployeeSkillRepository employeeSkills,
      RequiredSkillRepository requiredSkills,
      EmployeeCertificationRepository certifications,
      ManagerSkillAssessmentRepository managerAssessments,
      ProjectAssignmentRepository projectAssignments,
      TrainingProgramRepository trainingPrograms,
      SkillRepository skills
  ) {
    this.employeeSkills = employeeSkills;
    this.requiredSkills = requiredSkills;
    this.certifications = certifications;
    this.managerAssessments = managerAssessments;
    this.projectAssignments = projectAssignments;
    this.trainingPrograms = trainingPrograms;
    this.skills = skills;
  }

  @Transactional(readOnly = true)
  public Map<String, Object> analyze(AppUser employee) {
    var gaps = employee.getJobRole() == null
        ? new SkillGapService.SkillGapSummary(List.of(), 0, 0, 0, 0)
        : null;
    var recommendations = new TrainingRecommendationService.RecommendationSummary(List.of(), List.of(), Map.of());
    List<EmployeeSkill> mySkills = employeeSkills.findByEmployeeId(employee.getId());
    List<EmployeeCertification> myCerts = certifications.findByEmployeeIdOrderByCreatedAtDesc(employee.getId());
    List<ManagerSkillAssessment> myAssessments = managerAssessments.findByEmployee_IdOrderByCreatedAtDesc(employee.getId());
    return analyze(employee, mySkills, myCerts, myAssessments, gaps, recommendations);
  }

  @Transactional(readOnly = true)
  public Map<String, Object> analyze(
      AppUser employee,
      List<EmployeeSkill> mySkills,
      List<EmployeeCertification> myCerts,
      List<ManagerSkillAssessment> myAssessments,
      SkillGapService.SkillGapSummary gaps,
      TrainingRecommendationService.RecommendationSummary recommendations
  ) {
    List<RequiredSkill> roleRequirements = employee.getJobRole() == null
        ? List.of()
        : requiredSkills.findByJobRoleId(employee.getJobRole().getId());
    List<ProjectAssignment> myProjects = projectAssignments.findByEmployee_IdOrderByAssignedAtDesc(employee.getId());
    List<Skill> cvMatchedSkills = extractSkillsFromCv(employee.getCvText(), skills.findAll());

    Map<Long, RequiredSkill> requirementBySkill = roleRequirements.stream()
        .collect(Collectors.toMap(rs -> rs.getSkill().getId(), rs -> rs, (a, b) -> a));
    Map<Long, List<ManagerSkillAssessment>> assessmentsBySkill = myAssessments.stream()
        .collect(Collectors.groupingBy(a -> a.getSkill().getId()));
    Map<Long, Long> projectTouchesBySkill = countProjectSkillTouches(myProjects, mySkills);

    List<Map<String, Object>> table = new ArrayList<>();
    List<Map<String, Object>> trainingRecs = new ArrayList<>();
    List<Map<String, Object>> priorities = new ArrayList<>();
    int minor = 0, moderate = 0, critical = 0;

    for (EmployeeSkill es : mySkills) {
      Skill skill = es.getSkill();
      RequiredSkill req = requirementBySkill.get(skill.getId());
      SkillLevel requiredLevel = req == null ? SkillLevel.BEGINNER : req.getRequiredLevel();

      double selfAssessmentScore = levelToScore(es.getLevel());
      double managerScore = managerScore(assessmentsBySkill.get(skill.getId()));
      double experienceScore = experienceScore(projectTouchesBySkill.getOrDefault(skill.getId(), 0L));
      double certRelevanceScore = certificationScore(skill, myCerts);
      int peerEndorsements = peerEndorsementSignal(assessmentsBySkill.get(skill.getId()), projectTouchesBySkill.getOrDefault(skill.getId(), 0L));

      double competency = (selfAssessmentScore * 0.25)
          + (managerScore * 0.35)
          + (experienceScore * 0.20)
          + (certRelevanceScore * 0.20);
      int competencyRounded = round(competency);

      int requiredScore = levelToScore(requiredLevel);
      int gapPoints = Math.max(0, requiredScore - competencyRounded);
      String gapClass = classifyGap(gapPoints);
      if ("Minor Gap".equals(gapClass)) minor++;
      if ("Moderate Gap".equals(gapClass)) moderate++;
      if ("Critical Gap".equals(gapClass)) critical++;

      Map<String, Object> row = new LinkedHashMap<>();
      row.put("skill", skill.getName());
      row.put("category", skill.getCategory());
      row.put("frameworkTags", frameworkTags(skill));
      row.put("selfLevel", es.getLevel().name());
      row.put("requiredLevel", requiredLevel.name());
      row.put("competencyScore", competencyRounded);
      row.put("requiredScore", requiredScore);
      row.put("gapPoints", gapPoints);
      row.put("gapClass", gapClass);
      row.put("weightFactors", Map.of(
          "selfAssessment", round(selfAssessmentScore),
          "managerEvaluation", round(managerScore),
          "experienceDuration", round(experienceScore),
          "certificationRelevance", round(certRelevanceScore),
          "peerEndorsements", peerEndorsements
      ));
      row.put("evidenceSources", evidenceSources(skill, myCerts, assessmentsBySkill.get(skill.getId()), cvMatchedSkills));
      table.add(row);

      if (!"Minor Gap".equals(gapClass)) {
        trainingRecs.add(buildTrainingRecommendation(skill, gapClass, requiredLevel));
      }
      if (!"No Gap".equals(gapClass)) {
        priorities.add(Map.of(
            "skill", skill.getName(),
            "priority", gapClass,
            "timeline", timelineByGap(gapClass),
            "expectedImpact", impactByGap(gapClass)
        ));
      }
    }

    List<RequiredSkill> missingSkills = roleRequirements.stream()
        .filter(req -> mySkills.stream().noneMatch(es -> es.getSkill().getId().equals(req.getSkill().getId())))
        .toList();
    for (RequiredSkill miss : missingSkills) {
      critical++;
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("skill", miss.getSkill().getName());
      row.put("category", miss.getSkill().getCategory());
      row.put("frameworkTags", frameworkTags(miss.getSkill()));
      row.put("selfLevel", "MISSING");
      row.put("requiredLevel", miss.getRequiredLevel().name());
      row.put("competencyScore", 0);
      row.put("requiredScore", levelToScore(miss.getRequiredLevel()));
      row.put("gapPoints", levelToScore(miss.getRequiredLevel()));
      row.put("gapClass", "Critical Gap");
      row.put("weightFactors", Map.of(
          "selfAssessment", 0,
          "managerEvaluation", 0,
          "experienceDuration", 0,
          "certificationRelevance", 0,
          "peerEndorsements", 0
      ));
      row.put("evidenceSources", List.of("ROLE_REQUIREMENT"));
      table.add(row);
      trainingRecs.add(buildTrainingRecommendation(miss.getSkill(), "Critical Gap", miss.getRequiredLevel()));
      priorities.add(Map.of(
          "skill", miss.getSkill().getName(),
          "priority", "Critical Gap",
          "timeline", timelineByGap("Critical Gap"),
          "expectedImpact", impactByGap("Critical Gap")
      ));
    }

    int readinessScore = readinessScore(table);
    String readinessStatus = readinessStatus(readinessScore, critical);
    boolean cvAvailable = hasCvEvidence(employee, myCerts);

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("employeeContext", Map.of(
        "role", employee.getJobRole() == null ? null : employee.getJobRole().getName(),
        "department", employee.getDepartment() == null ? null : employee.getDepartment().getName(),
        "experienceLevel", experienceLevel(employee, myProjects),
        "projectHistoryCount", myProjects.size(),
        "uploadedDocuments", Map.of(
            "cvAvailable", cvAvailable,
            "certificationCount", myCerts.size()
        )
    ));
    out.put("skillAnalysisTable", table.stream()
        .sorted(Comparator.comparingInt(r -> -((Number) r.get("gapPoints")).intValue()))
        .toList());
    out.put("gapSummary", Map.of(
        "minorGapCount", minor,
        "moderateGapCount", moderate,
        "criticalGapCount", critical,
        "totalAnalyzedSkills", table.size()
    ));
    out.put("readiness", Map.of(
        "score", readinessScore,
        "status", readinessStatus
    ));
    out.put("trainingRecommendations", trainingRecs.stream().distinct().toList());
    out.put("cvSkillExtraction", Map.of(
        "matchedSkills", cvMatchedSkills.stream().map(Skill::getName).distinct().limit(20).toList(),
        "matchCount", cvMatchedSkills.size()
    ));
    out.put("careerSuggestions", buildCareerSuggestions(employee, readinessStatus, table));
    out.put("actionableInsights", Map.of(
        "prioritySkills", priorities.stream().limit(6).toList(),
        "suggestedTimeline", "Review every 30 days; manager validation every 60 days.",
        "expectedImpact", "Higher readiness score, lower critical gaps, better project fit.",
        "formula", "competency = self_assessment*0.25 + manager_evaluation*0.35 + experience_duration*0.20 + certification_relevance*0.20",
        "gapSignals", Map.of(
            "green", gaps == null ? 0 : gaps.greenCount(),
            "yellow", gaps == null ? 0 : gaps.yellowCount(),
            "orange", gaps == null ? 0 : gaps.orangeCount(),
            "red", gaps == null ? 0 : gaps.redCount()
        ),
        "recommendationSignals", Map.of(
            "recommendedTrainingCount", recommendations == null ? 0 : recommendations.items().size(),
            "careerSuggestionCount", recommendations == null ? 0 : recommendations.careerSuggestions().size()
        )
    ));
    out.put("skillDecayIndicators", buildSkillDecayIndicators(mySkills));
    out.put("activityTimeline", buildActivityTimeline(mySkills, myCerts, myAssessments, myProjects));
    out.put("dataCoverage", buildDataCoverage(employee, mySkills, myProjects, myAssessments, myCerts, cvAvailable));
    return out;
  }

  private static List<Map<String, Object>> buildSkillDecayIndicators(List<EmployeeSkill> mySkills) {
    Instant now = Instant.now();
    List<Map<String, Object>> out = new ArrayList<>();
    for (EmployeeSkill es : mySkills) {
      Instant updatedAt = es.getUpdatedAt();
      long daysSinceUpdate = updatedAt == null ? 365 : ChronoUnit.DAYS.between(updatedAt, now);
      String level;
      if (daysSinceUpdate >= 180) {
        level = "HIGH";
      } else if (daysSinceUpdate >= 90) {
        level = "MEDIUM";
      } else {
        level = "LOW";
      }
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("skill", es.getSkill().getName());
      row.put("daysSinceUpdate", Math.max(0, daysSinceUpdate));
      row.put("risk", level);
      row.put("recommendation", switch (level) {
        case "HIGH" -> "Reassess this skill now and add fresh evidence.";
        case "MEDIUM" -> "Schedule a review and update examples/projects.";
        default -> "Keep momentum with regular monthly updates.";
      });
      out.add(row);
    }
    out.sort(Comparator.comparingLong(r -> -((Number) r.get("daysSinceUpdate")).longValue()));
    return out.stream().limit(8).toList();
  }

  private static List<Map<String, Object>> buildActivityTimeline(
      List<EmployeeSkill> mySkills,
      List<EmployeeCertification> myCerts,
      List<ManagerSkillAssessment> myAssessments,
      List<ProjectAssignment> myProjects
  ) {
    List<Map<String, Object>> timeline = new ArrayList<>();
    for (EmployeeSkill es : mySkills) {
      if (es.getUpdatedAt() == null) continue;
      Map<String, Object> event = new LinkedHashMap<>();
      event.put("type", "SKILL_UPDATE");
      event.put("title", "Updated skill: " + es.getSkill().getName());
      event.put("at", es.getUpdatedAt());
      timeline.add(event);
    }
    for (EmployeeCertification cert : myCerts) {
      if (cert.getCreatedAt() == null) continue;
      Map<String, Object> event = new LinkedHashMap<>();
      event.put("type", "CERTIFICATION");
      event.put("title", "Uploaded certification: " + cert.getTitle());
      event.put("at", cert.getCreatedAt());
      timeline.add(event);
    }
    for (ManagerSkillAssessment assessment : myAssessments) {
      if (assessment.getCreatedAt() == null) continue;
      Map<String, Object> event = new LinkedHashMap<>();
      event.put("type", "MANAGER_REVIEW");
      event.put("title", "Manager assessed " + assessment.getSkill().getName());
      event.put("at", assessment.getCreatedAt());
      timeline.add(event);
    }
    for (ProjectAssignment project : myProjects) {
      if (project.getAssignedAt() == null) continue;
      Map<String, Object> event = new LinkedHashMap<>();
      event.put("type", "PROJECT_ASSIGNMENT");
      event.put("title", "Assigned to project: " + project.getProject().getName());
      event.put("at", project.getAssignedAt());
      timeline.add(event);
    }
    timeline.sort(Comparator.comparing((Map<String, Object> row) -> (Instant) row.get("at")).reversed());
    return timeline.stream().limit(12).toList();
  }

  private static Map<Long, Long> countProjectSkillTouches(List<ProjectAssignment> projects, List<EmployeeSkill> mySkills) {
    long count = projects.size();
    Map<Long, Long> out = new LinkedHashMap<>();
    for (EmployeeSkill es : mySkills) {
      out.put(es.getSkill().getId(), count);
    }
    return out;
  }

  private static List<String> frameworkTags(Skill skill) {
    String name = skill.getName() == null ? "" : skill.getName().toLowerCase(Locale.ROOT);
    String cat = skill.getCategory() == null ? "" : skill.getCategory().toLowerCase(Locale.ROOT);
    List<String> tags = new ArrayList<>();
    if (name.contains("service") || name.contains("incident") || name.contains("change") || cat.contains("ops")) {
      tags.add("ITIL");
    }
    if (name.contains("security") || name.contains("architecture") || name.contains("analysis")
        || name.contains("software") || cat.contains("engineering")) {
      tags.add("SFIA");
    }
    if (tags.isEmpty()) {
      tags.add("SFIA");
    }
    return tags;
  }

  private static double managerScore(List<ManagerSkillAssessment> skillAssessments) {
    if (skillAssessments == null || skillAssessments.isEmpty()) return 50;
    return skillAssessments.stream()
        .map(ManagerSkillAssessment::getAssessedLevel)
        .mapToDouble(EmployeeCompetencyAnalysisService::levelToScore)
        .average()
        .orElse(50);
  }

  private static double experienceScore(long projectTouchCount) {
    return Math.min(100, 35 + (projectTouchCount * 13));
  }

  private static double certificationScore(Skill skill, List<EmployeeCertification> certs) {
    if (certs == null || certs.isEmpty()) return 30;
    String skillName = skill.getName() == null ? "" : skill.getName().toLowerCase(Locale.ROOT);
    long relevant = certs.stream().filter(c -> {
      String title = c.getTitle() == null ? "" : c.getTitle().toLowerCase(Locale.ROOT);
      String issuer = c.getIssuer() == null ? "" : c.getIssuer().toLowerCase(Locale.ROOT);
      return title.contains(skillName) || issuer.contains(skillName);
    }).count();
    if (relevant == 0) return 45;
    return Math.min(100, 55 + (relevant * 20));
  }

  private static int peerEndorsementSignal(List<ManagerSkillAssessment> skillAssessments, long projectTouchCount) {
    int managerInteractions = skillAssessments == null ? 0 : skillAssessments.size();
    long raw = Math.round((managerInteractions * 2.0) + (projectTouchCount * 0.5));
    return (int) Math.max(0, Math.min(10, raw));
  }

  private Map<String, Object> buildTrainingRecommendation(Skill skill, String gapClass, SkillLevel targetLevel) {
    Optional<TrainingProgram> best = trainingPrograms.findBySkillId(skill.getId()).stream()
        .filter(tp -> tp.getTargetLevel().rank() >= targetLevel.rank())
        .findFirst();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("skill", skill.getName());
    out.put("gapSeverity", gapClass);
    out.put("learningDifficulty", gapClass.equals("Critical Gap") ? "High" : (gapClass.equals("Moderate Gap") ? "Medium" : "Low"));
    out.put("industryDemand", gapClass.equals("Critical Gap") ? "High" : "Medium");
    out.put("suggestedProgram", best.map(TrainingProgram::getTitle).orElse("Targeted internal learning path"));
    out.put("timeline", timelineByGap(gapClass));
    return out;
  }

  private static List<Map<String, Object>> buildCareerSuggestions(
      AppUser employee,
      String readinessStatus,
      List<Map<String, Object>> skillTable
  ) {
    String currentRole = employee.getJobRole() == null ? "Current Role" : employee.getJobRole().getName();
    long strongSkills = skillTable.stream().filter(r -> ((Number) r.get("competencyScore")).intValue() >= 80).count();
    List<Map<String, Object>> out = new ArrayList<>();
    out.add(Map.of(
        "path", "Deepen " + currentRole + " specialization",
        "fit", strongSkills >= 3 ? "High" : "Medium",
        "nextStep", "Strengthen project-critical skills and request advanced assignments."
    ));
    out.add(Map.of(
        "path", "Cross-functional capability growth",
        "fit", "Needs Improvement".equals(readinessStatus) ? "High" : "Medium",
        "nextStep", "Close moderate gaps and add one certification in a high-demand adjacent skill."
    ));
    return out;
  }

  private static String timelineByGap(String gapClass) {
    if ("Critical Gap".equals(gapClass)) return "8-12 weeks";
    if ("Moderate Gap".equals(gapClass)) return "4-8 weeks";
    if ("Minor Gap".equals(gapClass)) return "2-4 weeks";
    return "Maintain quarterly";
  }

  private static String impactByGap(String gapClass) {
    if ("Critical Gap".equals(gapClass)) return "High impact on delivery risk reduction and role readiness.";
    if ("Moderate Gap".equals(gapClass)) return "Medium impact on execution consistency and team velocity.";
    if ("Minor Gap".equals(gapClass)) return "Improves confidence and performance quality.";
    return "Sustains current readiness.";
  }

  private static String classifyGap(int gapPoints) {
    if (gapPoints == 0) return "No Gap";
    if (gapPoints <= 15) return "Minor Gap";
    if (gapPoints <= 30) return "Moderate Gap";
    return "Critical Gap";
  }

  private static int readinessScore(List<Map<String, Object>> table) {
    if (table.isEmpty()) return 0;
    double avg = table.stream()
        .mapToDouble(r -> ((Number) r.get("competencyScore")).doubleValue())
        .average()
        .orElse(0);
    return round(avg);
  }

  private static String readinessStatus(int score, int criticalGaps) {
    if (score >= 80 && criticalGaps == 0) return "Ready";
    if (score < 60 || criticalGaps > 2) return "Critical Skill Gap";
    return "Needs Improvement";
  }

  private static String experienceLevel(AppUser employee, List<ProjectAssignment> projects) {
    Instant firstAssignment = projects.stream()
        .map(ProjectAssignment::getAssignedAt)
        .filter(i -> i != null)
        .min(Comparator.naturalOrder())
        .orElse(employee.getCreatedAt());
    long months = firstAssignment == null ? 0 : Math.max(0, ChronoUnit.DAYS.between(firstAssignment, Instant.now()) / 30);
    if (months < 12) return "Junior";
    if (months < 36) return "Mid";
    return "Senior";
  }

  private static int levelToScore(SkillLevel level) {
    return switch (level) {
      case BEGINNER -> 30;
      case INTERMEDIATE -> 55;
      case ADVANCED -> 80;
      case EXPERT -> 95;
    };
  }

  private static int round(double value) {
    return (int) Math.round(value);
  }

  private static boolean hasCvEvidence(AppUser employee, List<EmployeeCertification> certs) {
    boolean hasCvText = employee.getCvText() != null && !employee.getCvText().isBlank();
    boolean hasCvFile = employee.getCvStoragePath() != null && !employee.getCvStoragePath().isBlank();
    boolean certMarkedCv = certs.stream().anyMatch(c -> {
      String t = c.getTitle() == null ? "" : c.getTitle().toLowerCase(Locale.ROOT);
      return t.contains("cv") || t.contains("resume");
    });
    return hasCvText || hasCvFile || certMarkedCv;
  }

  private static List<Skill> extractSkillsFromCv(String cvText, List<Skill> allSkills) {
    if (cvText == null || cvText.isBlank() || allSkills == null || allSkills.isEmpty()) return List.of();
    String normalized = cvText.toLowerCase(Locale.ROOT);
    return allSkills.stream()
        .filter(s -> s.getName() != null && !s.getName().isBlank())
        .filter(s -> normalized.contains(s.getName().toLowerCase(Locale.ROOT)))
        .toList();
  }

  private static List<String> evidenceSources(
      Skill skill,
      List<EmployeeCertification> certs,
      List<ManagerSkillAssessment> assessments,
      List<Skill> cvMatchedSkills
  ) {
    List<String> out = new ArrayList<>();
    out.add("SELF_ASSESSMENT");
    if (assessments != null && !assessments.isEmpty()) out.add("MANAGER_ASSESSMENT");
    String skillName = skill.getName() == null ? "" : skill.getName().toLowerCase(Locale.ROOT);
    boolean certHit = certs.stream().anyMatch(c -> {
      String t = c.getTitle() == null ? "" : c.getTitle().toLowerCase(Locale.ROOT);
      return t.contains(skillName);
    });
    if (certHit) out.add("CERTIFICATION");
    boolean cvHit = cvMatchedSkills.stream().anyMatch(s -> s.getId().equals(skill.getId()));
    if (cvHit) out.add("CV_EXTRACTED");
    out.add("PROJECT_HISTORY");
    return out;
  }

  private static Map<String, Object> buildDataCoverage(
      AppUser employee,
      List<EmployeeSkill> mySkills,
      List<ProjectAssignment> myProjects,
      List<ManagerSkillAssessment> myAssessments,
      List<EmployeeCertification> myCerts,
      boolean cvAvailable
  ) {
    List<String> missing = new ArrayList<>();
    if (employee.getJobRole() == null) missing.add("jobRole");
    if (employee.getDepartment() == null) missing.add("department");
    if (mySkills.isEmpty()) missing.add("skills");
    if (myProjects.isEmpty()) missing.add("projectHistory");
    if (myAssessments.isEmpty()) missing.add("managerAssessments");
    if (!cvAvailable) missing.add("cvEvidence");
    if (myCerts.isEmpty()) missing.add("certifications");
    return Map.of(
        "sourcesUsed", List.of(
            "personalInformation",
            "skillInventory",
            "cvUnstructuredText",
            "certificationDocuments",
            "projectExperienceHistory",
            "selfAssessmentLevels",
            "managerAssessments",
            "peerEndorsementSignal"
        ),
        "missingInputs", missing,
        "coveragePct", Math.max(0, 100 - (missing.size() * 12))
    );
  }
}

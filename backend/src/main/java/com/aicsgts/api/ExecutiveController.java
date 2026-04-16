package com.aicsgts.api;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Project;
import com.aicsgts.domain.RequiredSkill;
import com.aicsgts.domain.Role;
import com.aicsgts.domain.TrainingAssignment;
import com.aicsgts.domain.JobRole;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.EmployeeSkillRepository;
import com.aicsgts.repo.JobRoleRepository;
import com.aicsgts.repo.ProjectRepository;
import com.aicsgts.repo.RequiredSkillRepository;
import com.aicsgts.repo.TrainingAssignmentRepository;
import com.aicsgts.service.SkillGapService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xslf.usermodel.XSLFTextParagraph;
import org.apache.poi.xslf.usermodel.XSLFTextRun;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Read-only organizational posture for executive dashboards (spec module 7).
 */
@RestController
@RequestMapping("/api/executive")
public class ExecutiveController {

  private final AppUserRepository users;
  private final TrainingAssignmentRepository trainingAssignments;
  private final ProjectRepository projects;
  private final SkillGapService skillGapService;
  private final JobRoleRepository jobRoles;
  private final RequiredSkillRepository requiredSkills;
  private final EmployeeSkillRepository employeeSkills;

  public ExecutiveController(
      AppUserRepository users,
      TrainingAssignmentRepository trainingAssignments,
      ProjectRepository projects,
      SkillGapService skillGapService,
      JobRoleRepository jobRoles,
      RequiredSkillRepository requiredSkills,
      EmployeeSkillRepository employeeSkills
  ) {
    this.users = users;
    this.trainingAssignments = trainingAssignments;
    this.projects = projects;
    this.skillGapService = skillGapService;
    this.jobRoles = jobRoles;
    this.requiredSkills = requiredSkills;
    this.employeeSkills = employeeSkills;
  }

  @GetMapping("/summary")
  @PreAuthorize("hasAuthority('EXECUTIVE_DASHBOARD')")
  @Transactional(readOnly = true)
  public Map<String, Object> summary() {
    List<AppUser> employees = users.findByRoleOrderByNameAsc(Role.EMPLOYEE);
    long activeEmployees = employees.stream().filter(AppUser::isActive).count();

    List<TrainingAssignment> tas = trainingAssignments.findAll();
    long pendingTraining = tas.stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(ta -> ta.getStatus() == TrainingAssignment.Status.REQUESTED)
        .count();
    long completedTraining = tas.stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(ta -> ta.getStatus() == TrainingAssignment.Status.COMPLETED)
        .count();

    double readinessSum = 0;
    int readinessN = 0;
    int atRisk = 0;
    for (AppUser e : employees) {
      if (!e.isActive() || e.getJobRole() == null) {
        continue;
      }
      var g = skillGapService.computeForEmployee(e);
      int total = g.greenCount() + g.yellowCount() + g.orangeCount() + g.redCount();
      if (g.redCount() > 0) {
        atRisk++;
      }
      if (total > 0) {
        readinessSum += (100.0 * g.greenCount()) / total;
        readinessN++;
      } else {
        readinessSum += 100;
        readinessN++;
      }
    }
    int orgReadinessPct = readinessN == 0 ? 0 : (int) Math.round(readinessSum / readinessN);
    int trainingEffectivenessPct = (int) Math.round(100.0 * completedTraining / Math.max(1.0, pendingTraining + completedTraining));
    int talentRiskIndex = (int) Math.round(100.0 * atRisk / Math.max(1.0, activeEmployees));

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("totalEmployees", employees.size());
    out.put("activeEmployees", activeEmployees);
    out.put("orgReadinessPct", orgReadinessPct);
    out.put("employeesWithCriticalGaps", atRisk);
    out.put("pendingTrainingRequests", pendingTraining);
    out.put("completedTrainingAssignments", completedTraining);
    out.put("activeProjects", projects.count());
    out.put("skillReadinessIndex", orgReadinessPct);
    out.put("trainingEffectivenessPct", trainingEffectivenessPct);
    out.put("talentRiskIndex", talentRiskIndex);
    return out;
  }

  @GetMapping("/strategy")
  @PreAuthorize("hasAuthority('EXECUTIVE_DASHBOARD')")
  @Transactional(readOnly = true)
  public Map<String, Object> strategy() {
    List<AppUser> employees = users.findByRoleOrderByNameAsc(Role.EMPLOYEE).stream().filter(AppUser::isActive).toList();
    List<Project> projectList = projects.findAll();
    List<RequiredSkill> req = requiredSkills.findAll();

    int forecastDemand = forecastSkillDemand(projectList, req);
    int workforceGapForecast = forecastWorkforceGaps(employees);
    List<Map<String, Object>> trendRows = skillDemandTrends(projectList, req);
    Map<String, Object> support = decisionSupportModel(employees, projectList);

    return Map.of(
        "strategicKpis", Map.of(
            "skillReadinessIndex", summary().get("skillReadinessIndex"),
            "trainingEffectivenessPct", summary().get("trainingEffectivenessPct"),
            "talentRiskIndex", summary().get("talentRiskIndex")
        ),
        "decisionSupportModel", support,
        "decisionFormula", "Decision Score = (skill_gap_severity * weight1) + (training_cost * weight2) + (project_urgency * weight3)",
        "forecasts", Map.of(
            "futureSkillDemandIndex", forecastDemand,
            "workforceGapForecastIndex", workforceGapForecast,
            "skillDemandTrends", trendRows
        ),
        "workflow", List.of("View Insights", "Analyze Trends", "Simulate Scenarios", "Approve Strategy", "Monitor Outcomes")
    );
  }

  @GetMapping("/briefing.csv")
  @PreAuthorize("hasAuthority('EXECUTIVE_DASHBOARD')")
  @Transactional(readOnly = true)
  public ResponseEntity<byte[]> exportBriefingCsv() {
    Map<String, Object> s = summary();
    Map<String, Object> st = strategy();
    @SuppressWarnings("unchecked")
    Map<String, Object> support = (Map<String, Object>) st.get("decisionSupportModel");
    @SuppressWarnings("unchecked")
    Map<String, Object> forecasts = (Map<String, Object>) st.get("forecasts");
    StringBuilder sb = new StringBuilder();
    sb.append("metric,value\n");
    putCsv(sb, "skillReadinessIndex", s.get("skillReadinessIndex"));
    putCsv(sb, "trainingEffectivenessPct", s.get("trainingEffectivenessPct"));
    putCsv(sb, "talentRiskIndex", s.get("talentRiskIndex"));
    putCsv(sb, "decisionScore", support.get("decisionScore"));
    putCsv(sb, "skillGapSeverity", support.get("skillGapSeverity"));
    putCsv(sb, "trainingCost", support.get("trainingCost"));
    putCsv(sb, "projectUrgency", support.get("projectUrgency"));
    putCsv(sb, "futureSkillDemandIndex", forecasts.get("futureSkillDemandIndex"));
    putCsv(sb, "workforceGapForecastIndex", forecasts.get("workforceGapForecastIndex"));
    byte[] data = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=executive-briefing.csv")
        .contentType(MediaType.parseMediaType("text/csv;charset=utf-8"))
        .body(data);
  }

  @GetMapping("/briefing.pptx")
  @PreAuthorize("hasAuthority('EXECUTIVE_DASHBOARD')")
  @Transactional(readOnly = true)
  public ResponseEntity<byte[]> exportBriefingPptx() throws Exception {
    Map<String, Object> s = summary();
    Map<String, Object> st = strategy();
    @SuppressWarnings("unchecked")
    Map<String, Object> support = (Map<String, Object>) st.get("decisionSupportModel");
    @SuppressWarnings("unchecked")
    Map<String, Object> forecasts = (Map<String, Object>) st.get("forecasts");
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> trends = (List<Map<String, Object>>) forecasts.get("skillDemandTrends");
    byte[] deck;
    try (XMLSlideShow ppt = new XMLSlideShow()) {
      ppt.setPageSize(new java.awt.Dimension(960, 540));
      XSLFSlide slide = ppt.createSlide();
      XSLFTextBox box = slide.createTextBox();
      box.setAnchor(new java.awt.Rectangle(40, 32, 880, 470));
      XSLFTextParagraph p0 = box.addNewTextParagraph();
      XSLFTextRun r0 = p0.addNewTextRun();
      r0.setText("Executive Strategic Briefing");
      r0.setFontSize(28d);
      r0.setBold(true);

      XSLFTextParagraph p1 = box.addNewTextParagraph();
      XSLFTextRun r1 = p1.addNewTextRun();
      r1.setFontSize(16d);
      r1.setText("Generated: " + Instant.now() + "\n"
          + "Skill readiness index: " + s.get("skillReadinessIndex") + "\n"
          + "Training effectiveness: " + s.get("trainingEffectivenessPct") + "%\n"
          + "Talent risk index: " + s.get("talentRiskIndex") + "\n"
          + "Decision score: " + support.get("decisionScore") + "\n"
          + "Future skill demand: " + forecasts.get("futureSkillDemandIndex") + "\n"
          + "Workforce gap forecast: " + forecasts.get("workforceGapForecastIndex") + "\n\n"
          + "Workflow: View Insights -> Analyze Trends -> Simulate Scenarios -> Approve Strategy -> Monitor Outcomes");

      XSLFSlide slide2 = ppt.createSlide();
      XSLFTextBox box2 = slide2.createTextBox();
      box2.setAnchor(new java.awt.Rectangle(40, 32, 880, 470));
      XSLFTextParagraph t0 = box2.addNewTextParagraph();
      XSLFTextRun tr0 = t0.addNewTextRun();
      tr0.setText("Executive Trend Outlook");
      tr0.setFontSize(26d);
      tr0.setBold(true);

      int talentRisk = ((Number) s.getOrDefault("talentRiskIndex", 0)).intValue();
      int gapForecast = ((Number) forecasts.getOrDefault("workforceGapForecastIndex", 0)).intValue();
      int movement = gapForecast - talentRisk;
      String movementLabel = movement > 0 ? "Rising risk pressure" : (movement < 0 ? "Improving risk pressure" : "Stable risk pressure");

      XSLFTextParagraph t1 = box2.addNewTextParagraph();
      XSLFTextRun tr1 = t1.addNewTextRun();
      tr1.setFontSize(15d);
      tr1.setText("Risk movement: current talent risk " + talentRisk
          + " -> forecast gap index " + gapForecast
          + " (" + movementLabel + ", delta " + movement + ")");

      XSLFTextParagraph t2 = box2.addNewTextParagraph();
      XSLFTextRun tr2 = t2.addNewTextRun();
      tr2.setFontSize(15d);
      tr2.setText("Top skill demand trends:");

      int limit = Math.min(8, trends == null ? 0 : trends.size());
      for (int i = 0; i < limit; i++) {
        Map<String, Object> row = trends.get(i);
        XSLFTextParagraph tp = box2.addNewTextParagraph();
        XSLFTextRun tr = tp.addNewTextRun();
        tr.setFontSize(14d);
        tr.setText((i + 1) + ". " + row.get("skillName") + " — demand count " + row.get("demandCount"));
      }

      ByteArrayOutputStream bos = new ByteArrayOutputStream();
      ppt.write(bos);
      deck = bos.toByteArray();
    }
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=executive-briefing.pptx")
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"))
        .body(deck);
  }

  @PostMapping("/simulate")
  @PreAuthorize("hasAuthority('EXECUTIVE_DASHBOARD')")
  @Transactional(readOnly = true)
  public Map<String, Object> simulate(@Valid @RequestBody ScenarioRequest req) {
    double hireImpact = req.hiresPlanned() * 6.0;
    double trainImpact = req.trainingsPlanned() * 3.0;
    double adjustedGap = Math.max(0.0, req.skillGapSeverity() - hireImpact - trainImpact);
    double adjustedCost = req.trainingCost() + (req.hiresPlanned() * 7000.0);
    double decisionScore = (adjustedGap * req.weight1()) + (adjustedCost * req.weight2() / 1000.0) + (req.projectUrgency() * req.weight3());
    String recommendation = req.hiresPlanned() > req.trainingsPlanned()
        ? "Hire-first strategy for immediate capacity; pair with targeted upskilling."
        : "Train-first strategy for sustainable capability development; use selective hiring for critical shortfalls.";
    return Map.of(
        "scenario", Map.of(
            "hiresPlanned", req.hiresPlanned(),
            "trainingsPlanned", req.trainingsPlanned(),
            "skillGapSeverity", req.skillGapSeverity(),
            "trainingCost", req.trainingCost(),
            "projectUrgency", req.projectUrgency()
        ),
        "result", Map.of(
            "projectedSkillGapSeverity", round2(adjustedGap),
            "projectedTotalCost", round2(adjustedCost),
            "decisionScore", round2(decisionScore),
            "recommendation", recommendation
        )
    );
  }

  @GetMapping("/succession")
  @PreAuthorize("hasAuthority('EXECUTIVE_DASHBOARD')")
  @Transactional(readOnly = true)
  public List<?> succession() {
    List<Map<String, Object>> out = new ArrayList<>();
    for (JobRole jr : jobRoles.findAll()) {
      List<AppUser> pool = users.findByRoleAndJobRole_IdOrderByNameAsc(Role.EMPLOYEE, jr.getId());
      List<Map<String, Object>> candidates = pool.stream()
          .filter(AppUser::isActive)
          .map(u -> {
            var g = skillGapService.computeForEmployee(u);
            int total = g.greenCount() + g.yellowCount() + g.orangeCount() + g.redCount();
            int readinessPct = total == 0 ? 100 : (int) Math.round(100.0 * g.greenCount() / total);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("employeeId", u.getId());
            row.put("name", u.getName());
            row.put("readinessPct", readinessPct);
            row.put("criticalGaps", g.redCount());
            return row;
          })
          .sorted(Comparator.comparingInt((Map<String, Object> m) -> (Integer) m.get("readinessPct")).reversed())
          .limit(5)
          .toList();
      Map<String, Object> block = new LinkedHashMap<>();
      block.put("jobRoleId", jr.getId());
      block.put("jobRoleName", jr.getName());
      block.put("candidates", candidates);
      out.add(block);
    }
    return out;
  }

  private int forecastSkillDemand(List<Project> projects, List<RequiredSkill> req) {
    int near = (int) projects.stream()
        .filter(p -> p.getDeadlineAt() != null && ChronoUnit.DAYS.between(Instant.now(), p.getDeadlineAt()) <= 90)
        .count();
    int reqCount = req.size();
    return Math.min(100, (near * 8) + Math.min(60, reqCount / 2));
  }

  private int forecastWorkforceGaps(List<AppUser> employees) {
    int sumRed = 0;
    for (AppUser e : employees) {
      var g = skillGapService.computeForEmployee(e);
      sumRed += g.redCount();
    }
    return Math.min(100, sumRed * 7);
  }

  private List<Map<String, Object>> skillDemandTrends(List<Project> projectList, List<RequiredSkill> req) {
    Map<Long, Integer> counts = new HashMap<>();
    for (Project p : projectList) {
      if (p.getRequiredJobRole() == null) continue;
      req.stream()
          .filter(r -> r.getJobRole().getId().equals(p.getRequiredJobRole().getId()))
          .forEach(r -> counts.merge(r.getSkill().getId(), 1, Integer::sum));
    }
    List<Map<String, Object>> out = new ArrayList<>();
    req.stream()
        .map(RequiredSkill::getSkill)
        .collect(java.util.stream.Collectors.toMap(s -> s.getId(), s -> s, (a, b) -> a))
        .forEach((id, skill) -> {
          out.add(Map.of(
              "skillId", id,
              "skillName", skill.getName(),
              "demandCount", counts.getOrDefault(id, 0)
          ));
        });
    out.sort((a, b) -> Integer.compare((Integer) b.get("demandCount"), (Integer) a.get("demandCount")));
    return out.size() > 10 ? out.subList(0, 10) : out;
  }

  private Map<String, Object> decisionSupportModel(List<AppUser> employees, List<Project> projectList) {
    int skillGapSeverity = 0;
    for (AppUser e : employees) {
      var g = skillGapService.computeForEmployee(e);
      skillGapSeverity += g.gaps().stream().mapToInt(SkillGapService.SkillGapItem::gapRank).sum();
    }

    double trainingCost = trainingAssignments.findAll().stream()
        .filter(t -> t.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(t -> t.getStatus() == TrainingAssignment.Status.REQUESTED || t.getStatus() == TrainingAssignment.Status.APPROVED)
        .mapToDouble(t -> 1000.0)
        .sum();

    int urgentProjects = (int) projectList.stream()
        .filter(p -> p.getDeadlineAt() != null && ChronoUnit.DAYS.between(Instant.now(), p.getDeadlineAt()) <= 60)
        .count();
    int projectUrgency = urgentProjects * 10;

    double w1 = 0.5;
    double w2 = 0.2;
    double w3 = 0.3;
    double score = (skillGapSeverity * w1) + ((trainingCost / 1000.0) * w2) + (projectUrgency * w3);

    return Map.of(
        "skillGapSeverity", skillGapSeverity,
        "trainingCost", round2(trainingCost),
        "projectUrgency", projectUrgency,
        "weight1", w1,
        "weight2", w2,
        "weight3", w3,
        "decisionScore", round2(score)
    );
  }

  private static double round2(double v) {
    return Math.round(v * 100.0) / 100.0;
  }

  private static void putCsv(StringBuilder sb, String metric, Object value) {
    sb.append(metric).append(',').append(value == null ? "" : String.valueOf(value)).append('\n');
  }

  public record ScenarioRequest(
      @NotNull @Min(0) @Max(100) Integer hiresPlanned,
      @NotNull @Min(0) @Max(1000) Integer trainingsPlanned,
      @NotNull @Min(0) @Max(10000) Integer skillGapSeverity,
      @NotNull @Min(0) @Max(10_000_000) Double trainingCost,
      @NotNull @Min(0) @Max(1000) Integer projectUrgency,
      @NotNull Double weight1,
      @NotNull Double weight2,
      @NotNull Double weight3
  ) {}
}

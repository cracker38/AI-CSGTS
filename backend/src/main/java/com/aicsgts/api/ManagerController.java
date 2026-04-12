package com.aicsgts.api;

import com.aicsgts.domain.*;
import com.aicsgts.repo.*;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.service.SkillGapService;
import com.aicsgts.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager")
public class ManagerController {

  private final AppUserRepository users;
  private final EmployeeSkillRepository employeeSkills;
  private final RequiredSkillRepository requiredSkills;
  private final ProjectRepository projects;
  private final ProjectAssignmentRepository projectAssignments;
  private final TrainingAssignmentRepository trainingAssignments;
  private final SkillGapService skillGapService;
  private final AuditService audit;
  private final SkillRepository skills;
  private final ManagerSkillAssessmentRepository managerAssessments;

  public ManagerController(
      AppUserRepository users,
      EmployeeSkillRepository employeeSkills,
      RequiredSkillRepository requiredSkills,
      ProjectRepository projects,
      ProjectAssignmentRepository projectAssignments,
      TrainingAssignmentRepository trainingAssignments,
      SkillGapService skillGapService,
      AuditService audit,
      SkillRepository skills,
      ManagerSkillAssessmentRepository managerAssessments
  ) {
    this.users = users;
    this.employeeSkills = employeeSkills;
    this.requiredSkills = requiredSkills;
    this.projects = projects;
    this.projectAssignments = projectAssignments;
    this.trainingAssignments = trainingAssignments;
    this.skillGapService = skillGapService;
    this.audit = audit;
    this.skills = skills;
    this.managerAssessments = managerAssessments;
  }

  private AuthPrincipal principal() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof AuthPrincipal p)) {
      throw new SecurityException("UNAUTHORIZED");
    }
    return p;
  }

  @GetMapping("/dashboard")
  @PreAuthorize("hasAuthority('MANAGER_DASHBOARD')")
  @Transactional(readOnly = true)
  public Map<String, Object> dashboard() {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    Map<String, Object> out = new LinkedHashMap<>();
    if (me.getDepartment() == null) {
      out.put("department", null);
      out.put("team", List.of());
      Map<String, Object> emptyPerf = new LinkedHashMap<>();
      emptyPerf.put("directReportsCount", 0);
      emptyPerf.put("totalEmployees", 0);
      emptyPerf.put("trainingCompletedInDept", 0);
      emptyPerf.put("readinessScore", 0);
      emptyPerf.put("atRiskCount", 0);
      emptyPerf.put("notes", "Assign a department to unlock team analytics.");
      out.put("teamPerformance", emptyPerf);
      out.put("aggregateGaps", Map.of("green", 0, "yellow", 0, "orange", 0, "red", 0));
      out.put("trainingPipeline", Map.of());
      out.put("projectCoverage", List.of());
      return out;
    }

    long deptId = me.getDepartment().getId();
    String deptName = me.getDepartment().getName();
    long managerId = me.getId();
    String managerEmail = me.getEmail() == null ? "" : me.getEmail();

    // Only `users.role = EMPLOYEE` in this department; never list the signed-in manager (id / email).
    List<AppUser> team = users.findDirectReportsExcludingManager(deptId, Role.EMPLOYEE, managerId, managerEmail).stream()
        .filter(u -> u.getRole() == Role.EMPLOYEE)
        .filter(u -> !u.getId().equals(managerId))
        .filter(u -> managerEmail.isEmpty() || !u.getEmail().equalsIgnoreCase(managerEmail))
        .toList();

    int aggG = 0, aggY = 0, aggO = 0, aggR = 0;
    int atRisk = 0;
    double readinessSum = 0;
    int readinessDen = 0;

    var teamOverview = new ArrayList<Map<String, Object>>();
    for (AppUser emp : team) {
      var gaps = skillGapService.computeForEmployee(emp);
      int g = gaps.greenCount();
      int y = gaps.yellowCount();
      int o = gaps.orangeCount();
      int r = gaps.redCount();
      aggG += g;
      aggY += y;
      aggO += o;
      aggR += r;
      if (r > 0) {
        atRisk++;
      }
      int categorized = g + y + o + r;
      if (categorized > 0) {
        readinessSum += (100.0 * g) / categorized;
        readinessDen++;
      } else {
        readinessSum += 100;
        readinessDen++;
      }

      int severityScore = gaps.gaps().stream().mapToInt(SkillGapService.SkillGapItem::gapRank).sum();
      var topGaps = gaps.gaps().stream()
          .filter(item -> !"GREEN".equals(item.color()))
          .sorted(Comparator.comparingInt(SkillGapService.SkillGapItem::gapRank).reversed())
          .limit(4)
          .map(item -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("skillId", item.skillId());
            m.put("skillName", item.skillName());
            m.put("skillCategory", item.skillCategory());
            m.put("color", item.color());
            m.put("gapRank", item.gapRank());
            m.put("requiredLevel", item.requiredLevel());
            m.put("currentLevel", item.currentLevel());
            return m;
          })
          .toList();

      var skillsList = employeeSkills.findByEmployeeId(emp.getId()).stream()
          .map(es -> {
            Map<String, Object> sm = new LinkedHashMap<>();
            sm.put("skillId", es.getSkill().getId());
            sm.put("skillName", es.getSkill().getName());
            sm.put("level", es.getLevel());
            return sm;
          })
          .toList();
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("employeeId", emp.getId());
      row.put("name", emp.getName());
      row.put("email", emp.getEmail());
      row.put("jobRoleId", emp.getJobRole() == null ? null : emp.getJobRole().getId());
      row.put("jobRoleName", emp.getJobRole() == null ? null : emp.getJobRole().getName());
      row.put("skills", skillsList);
      row.put("gapCounts", Map.of("green", g, "yellow", y, "orange", o, "red", r));
      row.put("severityScore", severityScore);
      row.put("topGaps", topGaps);
      teamOverview.add(row);
    }

    long trainingCompleted = trainingAssignments.findAll().stream()
        .filter(ta -> ta.getStatus() == TrainingAssignment.Status.COMPLETED)
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(ta -> ta.getEmployee().getDepartment() != null && ta.getEmployee().getDepartment().getId().equals(deptId))
        .count();

    Map<TrainingAssignment.Status, Long> pipe = trainingAssignments.findAll().stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(ta -> ta.getEmployee().getDepartment() != null && ta.getEmployee().getDepartment().getId().equals(deptId))
        .collect(Collectors.groupingBy(TrainingAssignment::getStatus, Collectors.counting()));

    Map<String, Long> trainingPipeline = new LinkedHashMap<>();
    for (TrainingAssignment.Status st : TrainingAssignment.Status.values()) {
      trainingPipeline.put(st.name(), pipe.getOrDefault(st, 0L));
    }

    var projectCoverage = projects.findAll().stream().map(pr -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", pr.getId());
      row.put("name", pr.getName());
      row.put("requiredJobRoleId", pr.getRequiredJobRole() == null ? null : pr.getRequiredJobRole().getId());
      row.put("requiredJobRoleName", pr.getRequiredJobRole() == null ? null : pr.getRequiredJobRole().getName());
      row.put(
          "assigneesInMyDept",
          projectAssignments.countByProjectIdAndEmployeeDepartmentIdAndEmployeeRole(pr.getId(), deptId, Role.EMPLOYEE)
      );
      return row;
    }).toList();

    int readinessScore = readinessDen == 0 ? 100 : (int) Math.round(readinessSum / readinessDen);

    out.put("department", Map.of("id", deptId, "name", deptName));
    out.put("team", teamOverview);
    Map<String, Object> perfMap = new LinkedHashMap<>();
    perfMap.put("directReportsCount", team.size());
    perfMap.put("totalEmployees", team.size()); // alias for older clients
    perfMap.put("trainingCompletedInDept", trainingCompleted);
    perfMap.put("readinessScore", readinessScore);
    perfMap.put("atRiskCount", atRisk);
    perfMap.put(
        "notes",
        "Direct reports: employees in your department only — your own login (same id or work email) is never listed."
    );
    out.put("teamPerformance", perfMap);
    out.put("aggregateGaps", Map.of("green", aggG, "yellow", aggY, "orange", aggO, "red", aggR));
    out.put("trainingPipeline", trainingPipeline);
    out.put("projectCoverage", projectCoverage);
    return out;
  }

  @GetMapping("/training-assignments/pending")
  @PreAuthorize("hasAuthority('MANAGER_TRAINING_APPROVE')")
  @Transactional(readOnly = true)
  public List<?> pendingTrainingAssignments() {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    if (me.getDepartment() == null) return List.of();
    return trainingAssignments.findByStatusAndEmployeeDepartmentId(
            TrainingAssignment.Status.REQUESTED,
            me.getDepartment().getId()
        ).stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .map(ta -> Map.of(
            "id", ta.getId(),
            "employeeId", ta.getEmployee().getId(),
            "employeeName", ta.getEmployee().getName(),
            "programTitle", ta.getProgram().getTitle(),
            "status", ta.getStatus(),
            "requestedAt", ta.getRequestedAt()
        ))
        .toList();
  }

  @GetMapping("/projects")
  @PreAuthorize("hasAuthority('MANAGER_PROJECT_ALLOCATE')")
  @Transactional(readOnly = true)
  public List<?> listProjects() {
    return projects.findAll().stream().map(pr -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", pr.getId());
      row.put("name", pr.getName());
      row.put("requiredJobRoleId", pr.getRequiredJobRole() == null ? null : pr.getRequiredJobRole().getId());
      row.put("requiredJobRoleName", pr.getRequiredJobRole() == null ? null : pr.getRequiredJobRole().getName());
      return row;
    }).toList();
  }

  @PostMapping("/projects/{projectId}/auto-allocate")
  @PreAuthorize("hasAuthority('MANAGER_PROJECT_ALLOCATE')")
  @Transactional
  public Map<String, Object> autoAllocate(
      @PathVariable("projectId") Long projectId,
      @Valid @RequestBody AutoAllocateRequest req
  ) {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    if (me.getDepartment() == null) return Map.of("status", "NO_DEPARTMENT");

    Project project = projects.findById(projectId).orElseThrow(() -> new IllegalArgumentException("Invalid projectId"));
    if (project.getRequiredJobRole() == null) return Map.of("status", "MISSING_REQUIRED_JOB_ROLE");

    List<RequiredSkill> required = requiredSkills.findByJobRoleId(project.getRequiredJobRole().getId());
    List<AppUser> candidates = users.findDirectReportsExcludingManager(
        me.getDepartment().getId(),
        Role.EMPLOYEE,
        me.getId(),
        me.getEmail() == null ? "" : me.getEmail()
    );

    // Score: sum of gap ranks (lower is better).
    var scored = candidates.stream()
        .map(emp -> {
          var current = employeeSkills.findByEmployeeId(emp.getId());
          var gapSummary = skillGapService.computeForEmployee(emp, required, current);
          int score = gapSummary.gaps().stream().mapToInt(SkillGapService.SkillGapItem::gapRank).sum();
          return Map.entry(emp, score);
        })
        .sorted(Comparator.comparingInt(e -> (Integer) e.getValue()))
        .toList();

    clearDeptScopedAssignments(projectId, me.getDepartment().getId());

    int max = Math.min(req.maxAssignees(), scored.size());
    for (int i = 0; i < max; i++) {
      AppUser emp = scored.get(i).getKey();
      ProjectAssignment pa = new ProjectAssignment();
      pa.setProject(project);
      pa.setEmployee(emp);
      pa.setAssignedRole(project.getRequiredJobRole().getName());
      pa.setPosition(i);
      pa.setAssignedAt(Instant.now());
      projectAssignments.save(pa);
    }

    audit.log("MANAGER_AUTO_ALLOCATE", "projectId=" + projectId + ", max=" + max);
    return Map.of("status", "ALLOCATED", "assignees", max);
  }

  private void clearDeptScopedAssignments(long projectId, long deptId) {
    List<ProjectAssignment> all = projectAssignments.findByProject_IdOrderByPositionAscIdAsc(projectId);
    for (ProjectAssignment pa : all) {
      if (pa.getEmployee().getDepartment() != null && pa.getEmployee().getDepartment().getId().equals(deptId)) {
        projectAssignments.delete(pa);
      }
    }
  }

  @GetMapping("/projects/{projectId}/dept-staffing")
  @PreAuthorize("hasAuthority('MANAGER_PROJECT_ALLOCATE')")
  @Transactional(readOnly = true)
  public List<?> deptStaffing(@PathVariable("projectId") Long projectId) {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    if (me.getDepartment() == null) return List.of();
    long deptId = me.getDepartment().getId();
    return projectAssignments.findByProject_IdOrderByPositionAscIdAsc(projectId).stream()
        .filter(pa -> pa.getEmployee().getDepartment() != null && pa.getEmployee().getDepartment().getId().equals(deptId))
        .map(pa -> {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("assignmentId", pa.getId());
          row.put("employeeId", pa.getEmployee().getId());
          row.put("employeeName", pa.getEmployee().getName());
          row.put("position", pa.getPosition());
          return row;
        })
        .toList();
  }

  @PutMapping("/projects/{projectId}/dept-staffing-order")
  @PreAuthorize("hasAuthority('MANAGER_PROJECT_ALLOCATE')")
  @Transactional
  public Map<String, Object> setDeptStaffingOrder(
      @PathVariable("projectId") Long projectId,
      @Valid @RequestBody StaffOrderRequest req
  ) {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    if (me.getDepartment() == null) return Map.of("status", "NO_DEPARTMENT");
    projects.findById(projectId).orElseThrow(() -> new IllegalArgumentException("Invalid projectId"));
    long deptId = me.getDepartment().getId();

    List<AppUser> team = users.findDirectReportsExcludingManager(deptId, Role.EMPLOYEE, me.getId(),
        me.getEmail() == null ? "" : me.getEmail());
    var teamIds = team.stream().map(AppUser::getId).collect(Collectors.toSet());
    for (Long eid : req.employeeIds()) {
      if (!teamIds.contains(eid)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EMPLOYEE_NOT_IN_TEAM");
      }
    }

    clearDeptScopedAssignments(projectId, deptId);
    int pos = 0;
    for (Long eid : req.employeeIds()) {
      AppUser emp = users.findById(eid).orElseThrow();
      ProjectAssignment pa = new ProjectAssignment();
      pa.setProject(projects.findById(projectId).orElseThrow());
      pa.setEmployee(emp);
      pa.setAssignedRole(emp.getJobRole() != null ? emp.getJobRole().getName() : "Member");
      pa.setPosition(pos++);
      pa.setAssignedAt(Instant.now());
      projectAssignments.save(pa);
    }
    audit.log("MANAGER_STAFFING_REORDER", "projectId=" + projectId + ", count=" + req.employeeIds().size());
    return Map.of("status", "UPDATED");
  }

  @PostMapping("/skill-assessments")
  @PreAuthorize("hasAuthority('MANAGER_DASHBOARD')")
  @Transactional
  public Map<String, Object> submitAssessment(@Valid @RequestBody ManagerAssessmentRequest req) {
    AuthPrincipal p = principal();
    AppUser manager = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    AppUser employee = users.findById(req.employeeId()).orElseThrow(() -> new IllegalArgumentException("Invalid employeeId"));
    if (employee.getRole() != Role.EMPLOYEE || manager.getDepartment() == null
        || employee.getDepartment() == null
        || !manager.getDepartment().getId().equals(employee.getDepartment().getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "MANAGER_WRONG_DEPARTMENT");
    }
    Skill skill = skills.findById(req.skillId()).orElseThrow(() -> new IllegalArgumentException("Invalid skillId"));
    ManagerSkillAssessment a = new ManagerSkillAssessment();
    a.setManager(manager);
    a.setEmployee(employee);
    a.setSkill(skill);
    a.setAssessedLevel(req.assessedLevel());
    a.setNote(req.note());
    managerAssessments.save(a);
    audit.log("MANAGER_SKILL_ASSESSMENT", "employeeId=" + req.employeeId() + ", skillId=" + req.skillId());
    return Map.of("status", "SAVED", "id", a.getId());
  }

  @GetMapping("/skill-assessments")
  @PreAuthorize("hasAuthority('MANAGER_DASHBOARD')")
  @Transactional(readOnly = true)
  public List<?> listAssessmentsForEmployee(@RequestParam("employeeId") Long employeeId) {
    AuthPrincipal p = principal();
    AppUser manager = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    AppUser employee = users.findById(employeeId).orElseThrow(() -> new IllegalArgumentException("Invalid employeeId"));
    if (manager.getDepartment() == null || employee.getDepartment() == null
        || !manager.getDepartment().getId().equals(employee.getDepartment().getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "MANAGER_WRONG_DEPARTMENT");
    }
    return managerAssessments.findByManager_IdAndEmployee_IdOrderByCreatedAtDesc(manager.getId(), employeeId).stream()
        .map(a -> {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("id", a.getId());
          row.put("skillId", a.getSkill().getId());
          row.put("skillName", a.getSkill().getName());
          row.put("assessedLevel", a.getAssessedLevel());
          row.put("note", a.getNote());
          row.put("createdAt", a.getCreatedAt());
          return row;
        })
        .toList();
  }

  @PostMapping("/training-assignments/{id}/approve")
  @PreAuthorize("hasAuthority('MANAGER_TRAINING_APPROVE')")
  public Map<String, Object> approve(@PathVariable("id") Long id, @RequestBody(required = false) ReviewRequest req) {
    TrainingAssignment ta = trainingAssignments.findById(id).orElseThrow(() -> new IllegalArgumentException("Assignment not found"));
    AuthPrincipal principal = principal();
    AppUser me = users.findById(principal.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    AppUser assignee = ta.getEmployee();
    if (assignee.getRole() != Role.EMPLOYEE) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "MANAGER_CANNOT_APPROVE_NON_EMPLOYEE");
    }
    if (me.getDepartment() == null
        || assignee.getDepartment() == null
        || !me.getDepartment().getId().equals(assignee.getDepartment().getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "MANAGER_WRONG_DEPARTMENT");
    }
    if (ta.getStatus() != TrainingAssignment.Status.REQUESTED) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "ASSIGNMENT_NOT_PENDING");
    }
    ta.setStatus(TrainingAssignment.Status.APPROVED);
    ta.setReviewedBy(users.findById(principal.getUserId()).orElse(null));
    ta.setReviewedAt(Instant.now());
    if (req != null) ta.setReviewNote(req.note());
    trainingAssignments.save(ta);
    audit.log("MANAGER_APPROVE_TRAINING", "assignmentId=" + id);
    return Map.of("status", "APPROVED");
  }

  public record AutoAllocateRequest(@NotNull @Max(50) int maxAssignees) {}

  public record StaffOrderRequest(@NotEmpty List<@NotNull Long> employeeIds) {}

  public record ManagerAssessmentRequest(
      @NotNull Long employeeId,
      @NotNull Long skillId,
      @NotNull SkillLevel assessedLevel,
      String note
  ) {}

  public record ReviewRequest(String note) {}
}


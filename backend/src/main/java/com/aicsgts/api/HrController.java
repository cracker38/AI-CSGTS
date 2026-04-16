package com.aicsgts.api;

import com.aicsgts.domain.*;
import com.aicsgts.repo.*;
import com.aicsgts.service.AuditService;
import com.aicsgts.service.JobDescriptionNlpService;
import com.aicsgts.service.SkillGapService;
import com.aicsgts.service.HrWorkforceStrategyService;
import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hr")
public class HrController {

  private final AppUserRepository users;
  private final SkillRepository skills;
  private final JobRoleRepository jobRoles;
  private final RequiredSkillRepository requiredSkills;
  private final TrainingProgramRepository trainingPrograms;
  private final TrainingAssignmentRepository trainingAssignments;
  private final ProjectRepository projects;
  private final DepartmentRepository departments;
  private final AuditService audit;
  private final com.aicsgts.repo.SystemConfigRepository systemConfig;
  private final JobDescriptionNlpService jobDescriptionNlp;
  private final SkillGapService skillGapService;
  private final HrWorkforceStrategyService workforceStrategy;

  public HrController(
      AppUserRepository users,
      SkillRepository skills,
      JobRoleRepository jobRoles,
      RequiredSkillRepository requiredSkills,
      TrainingProgramRepository trainingPrograms,
      TrainingAssignmentRepository trainingAssignments,
      ProjectRepository projects,
      DepartmentRepository departments,
      AuditService audit,
      com.aicsgts.repo.SystemConfigRepository systemConfig,
      JobDescriptionNlpService jobDescriptionNlp,
      SkillGapService skillGapService,
      HrWorkforceStrategyService workforceStrategy
  ) {
    this.users = users;
    this.skills = skills;
    this.jobRoles = jobRoles;
    this.requiredSkills = requiredSkills;
    this.trainingPrograms = trainingPrograms;
    this.trainingAssignments = trainingAssignments;
    this.projects = projects;
    this.departments = departments;
    this.audit = audit;
    this.systemConfig = systemConfig;
    this.jobDescriptionNlp = jobDescriptionNlp;
    this.skillGapService = skillGapService;
    this.workforceStrategy = workforceStrategy;
  }

  @GetMapping("/stats")
  @PreAuthorize("hasAuthority('HR_EMPLOYEES')")
  @Transactional(readOnly = true)
  public Map<String, Object> organizationStats() {
    List<AppUser> employeesOnly = users.findByRoleOrderByNameAsc(Role.EMPLOYEE);
    long active = employeesOnly.stream().filter(AppUser::isActive).count();
    long programs = trainingPrograms.count();
    long skillCount = skills.count();
    List<TrainingAssignment> tas = trainingAssignments.findAll();
    long pending = tas.stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(ta -> ta.getStatus() == TrainingAssignment.Status.REQUESTED)
        .count();
    long approved = tas.stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(ta -> ta.getStatus() == TrainingAssignment.Status.APPROVED)
        .count();
    long completed = tas.stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .filter(ta -> ta.getStatus() == TrainingAssignment.Status.COMPLETED)
        .count();
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("totalUsers", employeesOnly.size());
    m.put("activeUsers", active);
    m.put("trainingPrograms", programs);
    m.put("skillsInTaxonomy", skillCount);
    m.put("pendingTrainingRequests", pending);
    m.put("approvedTrainingAssignments", approved);
    m.put("completedTrainingAssignments", completed);
    return m;
  }

  @GetMapping("/strategy")
  @PreAuthorize("hasAuthority('HR_EMPLOYEES')")
  @Transactional(readOnly = true)
  public Map<String, Object> workforceStrategy() {
    return workforceStrategy.snapshot();
  }

  @GetMapping("/employees")
  @PreAuthorize("hasAuthority('HR_EMPLOYEES')")
  @Transactional(readOnly = true)
  public List<?> employees() {
    return users.findByRoleOrderByNameAsc(Role.EMPLOYEE).stream().map(u -> Map.of(
        "id", u.getId(),
        "name", u.getName(),
        "email", u.getEmail(),
        "role", u.getRole(),
        "active", u.isActive(),
        "departmentId", u.getDepartment() == null ? null : u.getDepartment().getId(),
        "jobRoleId", u.getJobRole() == null ? null : u.getJobRole().getId()
    )).toList();
  }

  @PatchMapping("/employees/{id}/activate")
  @PreAuthorize("hasAuthority('HR_EMPLOYEES')")
  public Map<String, Object> setActive(@PathVariable("id") Long id, @Valid @RequestBody SetActiveRequest req) {
    AppUser u = users.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
    if (u.getRole() != Role.EMPLOYEE) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "HR_EMPLOYEES_ONLY");
    }
    u.setActive(req.active());
    users.save(u);
    audit.log("HR_SET_USER_ACTIVE", "userId=" + id + ", active=" + req.active());
    return Map.of("status", "UPDATED");
  }

  @PostMapping("/skills")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  public Map<String, Object> createSkill(@Valid @RequestBody SkillRequest req) {
    if (skills.findAll().stream().anyMatch(s -> s.getName() != null && s.getName().equalsIgnoreCase(req.name().trim()))) {
      return Map.of("status", "ALREADY_EXISTS");
    }
    Skill s = new Skill();
    s.setName(req.name());
    if (req.category() != null && !req.category().isBlank()) {
      s.setCategory(req.category().trim());
    }
    skills.save(s);
    audit.log("HR_CREATE_SKILL", "skill=" + req.name());
    return Map.of("status", "CREATED", "skillId", s.getId());
  }

  @GetMapping("/skills")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  @Transactional(readOnly = true)
  public List<?> listSkills() {
    return skills.findAll().stream().map(s -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", s.getId());
      row.put("name", s.getName());
      row.put("category", s.getCategory() == null ? "" : s.getCategory());
      return row;
    }).toList();
  }

  @PostMapping("/job-roles")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  public Map<String, Object> createJobRole(@Valid @RequestBody JobRoleRequest req) {
    JobRole r = new JobRole();
    r.setName(req.name());
    jobRoles.save(r);
    audit.log("HR_CREATE_JOB_ROLE", "jobRole=" + req.name());
    return Map.of("status", "CREATED", "jobRoleId", r.getId());
  }

  @GetMapping("/job-roles")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  @Transactional(readOnly = true)
  public List<?> listJobRoles() {
    return jobRoles.findAll().stream().map(r -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", r.getId());
      row.put("name", r.getName());
      String d = r.getDescriptionText();
      row.put("hasDescription", d != null && !d.isBlank());
      row.put("descriptionPreview", d == null ? "" : (d.length() > 160 ? d.substring(0, 160) + "…" : d));
      return row;
    }).toList();
  }

  @GetMapping("/job-roles/{jobRoleId}")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  @Transactional(readOnly = true)
  public Map<String, Object> getJobRole(@PathVariable("jobRoleId") Long jobRoleId) {
    JobRole jr = jobRoles.findById(jobRoleId).orElseThrow(() -> new IllegalArgumentException("Invalid jobRoleId"));
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", jr.getId());
    row.put("name", jr.getName());
    row.put("descriptionText", jr.getDescriptionText() == null ? "" : jr.getDescriptionText());
    return row;
  }

  @PatchMapping("/job-roles/{jobRoleId}/description")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  @Transactional
  public Map<String, Object> patchJobRoleDescription(
      @PathVariable("jobRoleId") Long jobRoleId,
      @Valid @RequestBody JobDescriptionPatchRequest req
  ) {
    JobRole jr = jobRoles.findById(jobRoleId).orElseThrow(() -> new IllegalArgumentException("Invalid jobRoleId"));
    jr.setDescriptionText(req.descriptionText() == null || req.descriptionText().isBlank() ? null : req.descriptionText().trim());
    jobRoles.save(jr);
    audit.log("HR_JOB_ROLE_DESCRIPTION", "jobRoleId=" + jobRoleId);
    return Map.of("status", "UPDATED");
  }

  @PostMapping("/nlp/job-description")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  public Map<String, Object> analyzeJobText(@Valid @RequestBody JobTextRequest req) {
    return jobDescriptionNlp.analyze(req.text());
  }

  @GetMapping("/succession")
  @PreAuthorize("hasAuthority('HR_EMPLOYEES')")
  @Transactional(readOnly = true)
  public List<?> successionPipeline() {
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

  @PostMapping("/job-roles/{jobRoleId}/required-skills")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  public Map<String, Object> addRequiredSkill(
      @PathVariable("jobRoleId") Long jobRoleId,
      @Valid @RequestBody RequiredSkillRequest req
  ) {
    JobRole jr = jobRoles.findById(jobRoleId).orElseThrow(() -> new IllegalArgumentException("Invalid jobRoleId"));
    Skill skill = skills.findById(req.skillId()).orElseThrow(() -> new IllegalArgumentException("Invalid skillId"));

    RequiredSkill rs = new RequiredSkill();
    rs.setJobRole(jr);
    rs.setSkill(skill);
    rs.setRequiredLevel(req.requiredLevel());
    requiredSkills.save(rs);
    audit.log("HR_ADD_REQUIRED_SKILL", "jobRoleId=" + jobRoleId + ", skillId=" + req.skillId());
    return Map.of("status", "CREATED");
  }

  @GetMapping("/job-roles/{jobRoleId}/required-skills")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  @Transactional(readOnly = true)
  public List<?> requiredSkillsFor(@PathVariable("jobRoleId") Long jobRoleId) {
    return requiredSkills.findByJobRoleId(jobRoleId).stream().map(rs -> Map.of(
        "id", rs.getId(),
        "skillId", rs.getSkill().getId(),
        "skillName", rs.getSkill().getName(),
        "requiredLevel", rs.getRequiredLevel()
    )).toList();
  }

  @PostMapping("/training-programs")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  public Map<String, Object> createTraining(@Valid @RequestBody TrainingProgramRequest req) {
    Skill skill = skills.findById(req.skillId()).orElseThrow(() -> new IllegalArgumentException("Invalid skillId"));
    TrainingProgram tp = new TrainingProgram();
    tp.setTitle(req.title());
    tp.setDescription(req.description());
    tp.setSkill(skill);
    tp.setTargetLevel(req.targetLevel());
    tp.setProvider(req.provider() == null || req.provider().isBlank() ? null : req.provider().trim());
    tp.setDeliveryFormat(req.deliveryFormat() == null ? TrainingDeliveryFormat.ONLINE : req.deliveryFormat());
    trainingPrograms.save(tp);
    audit.log("HR_CREATE_TRAINING_PROGRAM", "title=" + req.title());
    return Map.of("status", "CREATED", "programId", tp.getId());
  }

  @GetMapping("/training-programs")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  @Transactional(readOnly = true)
  public List<?> trainingPrograms() {
    return trainingPrograms.findAll().stream().map(tp -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", tp.getId());
      row.put("title", tp.getTitle());
      row.put("description", tp.getDescription());
      row.put("skillId", tp.getSkill().getId());
      row.put("targetLevel", tp.getTargetLevel());
      row.put("provider", tp.getProvider() == null ? "" : tp.getProvider());
      row.put(
          "deliveryFormat",
          tp.getDeliveryFormat() == null ? TrainingDeliveryFormat.ONLINE.name() : tp.getDeliveryFormat().name()
      );
      return row;
    }).toList();
  }

  @GetMapping("/training-assignments")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  @Transactional(readOnly = true)
  public List<?> listTrainingAssignments() {
    return trainingAssignments.findAll().stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .sorted((a, b) -> b.getRequestedAt().compareTo(a.getRequestedAt()))
        .map(ta -> {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("id", ta.getId());
          row.put("employeeId", ta.getEmployee().getId());
          row.put("employeeName", ta.getEmployee().getName());
          row.put("programId", ta.getProgram().getId());
          row.put("programTitle", ta.getProgram().getTitle());
          row.put("status", ta.getStatus());
          row.put("requestedAt", ta.getRequestedAt());
          row.put("reviewedAt", ta.getReviewedAt());
          return row;
        })
        .toList();
  }

  @PostMapping("/training-assignments")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  public Map<String, Object> assignTraining(@Valid @RequestBody TrainingAssignmentRequest req) {
    AppUser employee = users.findById(req.employeeId()).orElseThrow(() -> new IllegalArgumentException("Invalid employeeId"));
    if (employee.getRole() != Role.EMPLOYEE) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TRAINING_ASSIGNEE_MUST_BE_EMPLOYEE");
    }
    TrainingProgram program = trainingPrograms.findById(req.programId()).orElseThrow(() -> new IllegalArgumentException("Invalid programId"));

    TrainingAssignment ta = new TrainingAssignment();
    ta.setEmployee(employee);
    ta.setProgram(program);
    ta.setStatus(TrainingAssignment.Status.REQUESTED);
    ta.setRequestedAt(Instant.now());
    trainingAssignments.save(ta);
    audit.log("HR_ASSIGN_TRAINING", "employeeId=" + req.employeeId() + ", programId=" + req.programId());
    return Map.of("status", "REQUESTED", "assignmentId", ta.getId());
  }

  @PostMapping("/training-assignments/{id}/approve")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  public Map<String, Object> approve(@PathVariable("id") Long id, @RequestBody(required = false) ReviewRequest req) {
    TrainingAssignment ta = trainingAssignments.findById(id).orElseThrow(() -> new IllegalArgumentException("Assignment not found"));
    ta.setStatus(TrainingAssignment.Status.APPROVED);
    ta.setReviewedAt(Instant.now());
    // In MVP we do not track reviewedBy precisely.
    if (req != null) ta.setReviewNote(req.note());
    trainingAssignments.save(ta);
    audit.log("HR_APPROVE_TRAINING", "assignmentId=" + id);
    return Map.of("status", "APPROVED");
  }

  @PostMapping("/training-assignments/{id}/reject")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  public Map<String, Object> reject(@PathVariable("id") Long id, @RequestBody(required = false) ReviewRequest req) {
    TrainingAssignment ta = trainingAssignments.findById(id).orElseThrow(() -> new IllegalArgumentException("Assignment not found"));
    ta.setStatus(TrainingAssignment.Status.REJECTED);
    ta.setReviewedAt(Instant.now());
    if (req != null) ta.setReviewNote(req.note());
    trainingAssignments.save(ta);
    audit.log("HR_REJECT_TRAINING", "assignmentId=" + id);
    return Map.of("status", "REJECTED");
  }

  @GetMapping("/projects")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  @Transactional(readOnly = true)
  public List<?> listProjects() {
    return projects.findAll().stream().map(pr -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", pr.getId());
      row.put("name", pr.getName());
      row.put("requiredJobRoleId", pr.getRequiredJobRole() == null ? null : pr.getRequiredJobRole().getId());
      row.put("requiredJobRoleName", pr.getRequiredJobRole() == null ? null : pr.getRequiredJobRole().getName());
      row.put("deadlineAt", pr.getDeadlineAt());
      row.put("daysToDeadline", daysToDeadline(pr));
      return row;
    }).toList();
  }

  @PostMapping("/projects")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  public Map<String, Object> createProject(@Valid @RequestBody CreateProjectRequest req) {
    Project pr = new Project();
    pr.setName(req.name().trim());
    if (req.requiredJobRoleId() != null) {
      JobRole jr = jobRoles.findById(req.requiredJobRoleId()).orElseThrow(() -> new IllegalArgumentException("Invalid requiredJobRoleId"));
      pr.setRequiredJobRole(jr);
    }
    if (req.deadlineDate() != null && !req.deadlineDate().isBlank()) {
      pr.setDeadlineAt(java.time.LocalDate.parse(req.deadlineDate().trim()).atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
    }
    projects.save(pr);
    audit.log("HR_CREATE_PROJECT", "projectId=" + pr.getId());
    return Map.of("status", "CREATED", "projectId", pr.getId());
  }

  @PutMapping("/projects/{projectId}/deadline")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  public Map<String, Object> setProjectDeadline(@PathVariable("projectId") Long projectId, @RequestBody(required = false) ProjectDeadlineRequest req) {
    Project pr = projects.findById(projectId).orElseThrow(() -> new IllegalArgumentException("Invalid projectId"));
    Instant deadline = null;
    if (req != null && req.deadlineDate() != null && !req.deadlineDate().isBlank()) {
      deadline = java.time.LocalDate.parse(req.deadlineDate().trim()).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
    }
    pr.setDeadlineAt(deadline);
    projects.save(pr);
    audit.log("HR_SET_PROJECT_DEADLINE", "projectId=" + projectId);
    return Map.of("status", "UPDATED", "deadlineAt", pr.getDeadlineAt(), "daysToDeadline", daysToDeadline(pr));
  }

  private static long daysToDeadline(Project project) {
    if (project.getDeadlineAt() == null) return -1;
    return java.time.temporal.ChronoUnit.DAYS.between(Instant.now(), project.getDeadlineAt());
  }

  public record SetActiveRequest(@NotNull Boolean active) {
  }

  public record SkillRequest(@NotBlank String name, @Nullable String category) {
  }

  public record JobRoleRequest(@NotBlank String name) {
  }

  public record RequiredSkillRequest(
      @NotNull Long skillId,
      @NotNull SkillLevel requiredLevel
  ) {
  }

  public record TrainingProgramRequest(
      @NotBlank String title,
      String description,
      @NotNull Long skillId,
      @NotNull SkillLevel targetLevel,
      @Nullable String provider,
      @Nullable TrainingDeliveryFormat deliveryFormat
  ) {
  }

  public record TrainingAssignmentRequest(
      @NotNull Long employeeId,
      @NotNull Long programId
  ) {
  }

  public record ReviewRequest(String note) {
  }

  public record CreateProjectRequest(
      @NotBlank String name,
      @Nullable Long requiredJobRoleId,
      @Nullable String deadlineDate
  ) {}

  public record ProjectDeadlineRequest(@Nullable String deadlineDate) {}

  public record JobDescriptionPatchRequest(@Nullable String descriptionText) {
  }

  public record JobTextRequest(@NotBlank String text) {
  }
}


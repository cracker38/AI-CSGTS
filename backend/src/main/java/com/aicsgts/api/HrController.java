package com.aicsgts.api;

import com.aicsgts.domain.*;
import com.aicsgts.repo.*;
import com.aicsgts.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/hr")
public class HrController {

  private final AppUserRepository users;
  private final SkillRepository skills;
  private final JobRoleRepository jobRoles;
  private final RequiredSkillRepository requiredSkills;
  private final TrainingProgramRepository trainingPrograms;
  private final TrainingAssignmentRepository trainingAssignments;
  private final DepartmentRepository departments;
  private final AuditService audit;
  private final com.aicsgts.repo.SystemConfigRepository systemConfig;

  public HrController(
      AppUserRepository users,
      SkillRepository skills,
      JobRoleRepository jobRoles,
      RequiredSkillRepository requiredSkills,
      TrainingProgramRepository trainingPrograms,
      TrainingAssignmentRepository trainingAssignments,
      DepartmentRepository departments,
      AuditService audit,
      com.aicsgts.repo.SystemConfigRepository systemConfig
  ) {
    this.users = users;
    this.skills = skills;
    this.jobRoles = jobRoles;
    this.requiredSkills = requiredSkills;
    this.trainingPrograms = trainingPrograms;
    this.trainingAssignments = trainingAssignments;
    this.departments = departments;
    this.audit = audit;
    this.systemConfig = systemConfig;
  }

  @GetMapping("/stats")
  @PreAuthorize("hasAuthority('HR_EMPLOYEES')")
  @Transactional(readOnly = true)
  public Map<String, Object> organizationStats() {
    List<AppUser> all = users.findAll();
    long active = all.stream().filter(AppUser::isActive).count();
    long programs = trainingPrograms.count();
    long skillCount = skills.count();
    List<TrainingAssignment> tas = trainingAssignments.findAll();
    long pending = tas.stream().filter(ta -> ta.getStatus() == TrainingAssignment.Status.REQUESTED).count();
    long approved = tas.stream().filter(ta -> ta.getStatus() == TrainingAssignment.Status.APPROVED).count();
    long completed = tas.stream().filter(ta -> ta.getStatus() == TrainingAssignment.Status.COMPLETED).count();
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("totalUsers", all.size());
    m.put("activeUsers", active);
    m.put("trainingPrograms", programs);
    m.put("skillsInTaxonomy", skillCount);
    m.put("pendingTrainingRequests", pending);
    m.put("approvedTrainingAssignments", approved);
    m.put("completedTrainingAssignments", completed);
    return m;
  }

  @GetMapping("/employees")
  @PreAuthorize("hasAuthority('HR_EMPLOYEES')")
  @Transactional(readOnly = true)
  public List<?> employees() {
    return users.findAll().stream().map(u -> Map.of(
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
    u.setActive(req.active());
    users.save(u);
    audit.log("HR_SET_USER_ACTIVE", "userId=" + id + ", active=" + req.active());
    return Map.of("status", "UPDATED");
  }

  @PostMapping("/skills")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  public Map<String, Object> createSkill(@Valid @RequestBody SkillRequest req) {
    Skill s = new Skill();
    s.setName(req.name());
    skills.save(s);
    audit.log("HR_CREATE_SKILL", "skill=" + req.name());
    return Map.of("status", "CREATED", "skillId", s.getId());
  }

  @GetMapping("/skills")
  @PreAuthorize("hasAuthority('HR_SKILL_TAXONOMY')")
  @Transactional(readOnly = true)
  public List<?> listSkills() {
    return skills.findAll().stream().map(s -> Map.of(
        "id", s.getId(),
        "name", s.getName()
    )).toList();
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
    return jobRoles.findAll().stream().map(r -> Map.of(
        "id", r.getId(),
        "name", r.getName()
    )).toList();
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
    trainingPrograms.save(tp);
    audit.log("HR_CREATE_TRAINING_PROGRAM", "title=" + req.title());
    return Map.of("status", "CREATED", "programId", tp.getId());
  }

  @GetMapping("/training-programs")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  @Transactional(readOnly = true)
  public List<?> trainingPrograms() {
    return trainingPrograms.findAll().stream().map(tp -> Map.of(
        "id", tp.getId(),
        "title", tp.getTitle(),
        "description", tp.getDescription(),
        "skillId", tp.getSkill().getId(),
        "targetLevel", tp.getTargetLevel()
    )).toList();
  }

  @GetMapping("/training-assignments")
  @PreAuthorize("hasAuthority('HR_TRAINING_MANAGEMENT')")
  @Transactional(readOnly = true)
  public List<?> listTrainingAssignments() {
    return trainingAssignments.findAll().stream()
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

  public record SetActiveRequest(@NotNull Boolean active) {
  }

  public record SkillRequest(@NotBlank String name) {
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
      @NotNull SkillLevel targetLevel
  ) {
  }

  public record TrainingAssignmentRequest(
      @NotNull Long employeeId,
      @NotNull Long programId
  ) {
  }

  public record ReviewRequest(String note) {
  }
}


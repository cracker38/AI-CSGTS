package com.aicsgts.api;

import com.aicsgts.domain.*;
import com.aicsgts.repo.*;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.service.SkillGapService;
import com.aicsgts.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

  public ManagerController(
      AppUserRepository users,
      EmployeeSkillRepository employeeSkills,
      RequiredSkillRepository requiredSkills,
      ProjectRepository projects,
      ProjectAssignmentRepository projectAssignments,
      TrainingAssignmentRepository trainingAssignments,
      SkillGapService skillGapService,
      AuditService audit
  ) {
    this.users = users;
    this.employeeSkills = employeeSkills;
    this.requiredSkills = requiredSkills;
    this.projects = projects;
    this.projectAssignments = projectAssignments;
    this.trainingAssignments = trainingAssignments;
    this.skillGapService = skillGapService;
    this.audit = audit;
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
    if (me.getDepartment() == null) return Map.of("team", List.of());

    List<AppUser> team = users.findByDepartment_Id(me.getDepartment().getId()).stream()
        .filter(u -> u.getRole() == Role.EMPLOYEE || u.getRole() == Role.MANAGER) // MVP filter
        .toList();

    var teamOverview = team.stream().map(emp -> {
      var gaps = skillGapService.computeForEmployee(emp);
      var skillsList = employeeSkills.findByEmployeeId(emp.getId()).stream()
          .map(es -> Map.of(
              "skillName", es.getSkill().getName(),
              "level", es.getLevel()
          ))
          .toList();
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("employeeId", emp.getId());
      row.put("name", emp.getName());
      row.put("email", emp.getEmail());
      row.put("jobRoleId", emp.getJobRole() == null ? null : emp.getJobRole().getId());
      row.put("jobRoleName", emp.getJobRole() == null ? null : emp.getJobRole().getName());
      row.put("skills", skillsList);
      row.put("gapCounts", Map.of(
          "green", gaps.greenCount(),
          "yellow", gaps.yellowCount(),
          "orange", gaps.orangeCount(),
          "red", gaps.redCount()
      ));
      return row;
    }).toList();

    long trainingCompleted = trainingAssignments.findAll().stream()
        .filter(ta -> ta.getStatus() == TrainingAssignment.Status.COMPLETED)
        .filter(ta -> ta.getEmployee().getDepartment() != null && ta.getEmployee().getDepartment().getId().equals(me.getDepartment().getId()))
        .count();

    return Map.of(
        "team", teamOverview,
        "teamPerformance", Map.of(
            "totalEmployees", team.size(),
            "trainingCompletedInDept", trainingCompleted,
            "notes", "Skill coverage and gap severity by employee."
        )
    );
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
  @Transactional(readOnly = true)
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
    List<AppUser> candidates = users.findByDepartment_Id(me.getDepartment().getId());

    // Score: sum of gap ranks (lower is better).
    var scored = candidates.stream()
        .filter(u -> u.getRole() == Role.EMPLOYEE)
        .map(emp -> {
          var current = employeeSkills.findByEmployeeId(emp.getId());
          var gapSummary = skillGapService.computeForEmployee(emp, required, current);
          int score = gapSummary.gaps().stream().mapToInt(SkillGapService.SkillGapItem::gapRank).sum();
          return Map.entry(emp, score);
        })
        .sorted(Comparator.comparingInt(e -> (Integer) e.getValue()))
        .toList();

    int max = Math.min(req.maxAssignees(), scored.size());
    scored.subList(0, max).forEach(entry -> {
      AppUser emp = entry.getKey();
      ProjectAssignment pa = new ProjectAssignment();
      pa.setProject(project);
      pa.setEmployee(emp);
      pa.setAssignedRole(project.getRequiredJobRole().getName());
      pa.setAssignedAt(Instant.now());
      projectAssignments.save(pa);
    });

    audit.log("MANAGER_AUTO_ALLOCATE", "projectId=" + projectId + ", max=" + max);
    return Map.of("status", "ALLOCATED", "assignees", max);
  }

  @PostMapping("/training-assignments/{id}/approve")
  @PreAuthorize("hasAuthority('MANAGER_TRAINING_APPROVE')")
  public Map<String, Object> approve(@PathVariable("id") Long id, @RequestBody(required = false) ReviewRequest req) {
    TrainingAssignment ta = trainingAssignments.findById(id).orElseThrow(() -> new IllegalArgumentException("Assignment not found"));
    AuthPrincipal principal = principal();
    ta.setStatus(TrainingAssignment.Status.APPROVED);
    ta.setReviewedBy(users.findById(principal.getUserId()).orElse(null));
    ta.setReviewedAt(Instant.now());
    if (req != null) ta.setReviewNote(req.note());
    trainingAssignments.save(ta);
    audit.log("MANAGER_APPROVE_TRAINING", "assignmentId=" + id);
    return Map.of("status", "APPROVED");
  }

  public record AutoAllocateRequest(@NotNull @Max(50) int maxAssignees) {}

  public record ReviewRequest(String note) {}
}


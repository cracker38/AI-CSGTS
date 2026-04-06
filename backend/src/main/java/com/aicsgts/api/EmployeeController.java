package com.aicsgts.api;

import com.aicsgts.domain.*;
import com.aicsgts.repo.*;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.service.SkillGapService;
import com.aicsgts.service.TrainingRecommendationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/employee")
public class EmployeeController {

  private final AppUserRepository users;
  private final SkillRepository skills;
  private final EmployeeSkillRepository employeeSkills;
  private final RequiredSkillRepository requiredSkills;
  private final TrainingAssignmentRepository trainingAssignments;
  private final SkillGapService skillGapService;
  private final TrainingRecommendationService trainingRecommendationService;

  public EmployeeController(
      AppUserRepository users,
      SkillRepository skills,
      EmployeeSkillRepository employeeSkills,
      RequiredSkillRepository requiredSkills,
      TrainingAssignmentRepository trainingAssignments,
      SkillGapService skillGapService,
      TrainingRecommendationService trainingRecommendationService
  ) {
    this.users = users;
    this.skills = skills;
    this.employeeSkills = employeeSkills;
    this.requiredSkills = requiredSkills;
    this.trainingAssignments = trainingAssignments;
    this.skillGapService = skillGapService;
    this.trainingRecommendationService = trainingRecommendationService;
  }

  private AuthPrincipal principal() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof AuthPrincipal p)) {
      throw new SecurityException("UNAUTHORIZED");
    }
    return p;
  }

  @GetMapping("/dashboard")
  @PreAuthorize("hasAuthority('EMPLOYEE_DASHBOARD')")
  @Transactional(readOnly = true)
  public Map<String, Object> dashboard() {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));

    var gaps = skillGapService.computeForEmployee(me);
    var recommendations = trainingRecommendationService.recommendForEmployee(gaps);

    List<TrainingAssignment> myAssignments = trainingAssignments.findByEmployeeId(me.getId());

    // Minimal notification feed (training-related).
    var notifications = myAssignments.stream().limit(10).map(a -> Map.of(
        "type", "TRAINING",
        "programTitle", a.getProgram().getTitle(),
        "status", a.getStatus(),
        "requestedAt", a.getRequestedAt()
    )).toList();

    return Map.of(
        "profile", Map.of(
            "id", me.getId(),
            "name", me.getName(),
            "departmentId", me.getDepartment() == null ? null : me.getDepartment().getId(),
            "role", me.getRole(),
            "jobRoleId", me.getJobRole() == null ? null : me.getJobRole().getId()
        ),
        "skills", employeeSkills.findByEmployeeId(me.getId()).stream().map(es -> Map.of(
            "skillId", es.getSkill().getId(),
            "skillName", es.getSkill().getName(),
            "level", es.getLevel()
        )).toList(),
        "skillGapAnalysis", Map.of(
            "gaps", gaps.gaps(),
            "counts", Map.of(
                "green", gaps.greenCount(),
                "yellow", gaps.yellowCount(),
                "orange", gaps.orangeCount(),
                "red", gaps.redCount()
            )
        ),
        "trainingRecommendations", Map.of(
            "items", recommendations.items(),
            "careerSuggestions", recommendations.careerSuggestions(),
            "gapTrends", recommendations.gapTrends()
        ),
        "notifications", notifications
    );
  }

  @GetMapping("/available-skills")
  @PreAuthorize("hasAuthority('EMPLOYEE_SKILLS')")
  @Transactional(readOnly = true)
  public List<?> availableSkills() {
    return skills.findAll().stream()
        .map(s -> Map.of("id", s.getId(), "name", s.getName()))
        .toList();
  }

  @GetMapping("/skills")
  @PreAuthorize("hasAuthority('EMPLOYEE_SKILLS')")
  @Transactional(readOnly = true)
  public List<?> mySkills() {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    return employeeSkills.findByEmployeeId(me.getId()).stream()
        .map(es -> Map.of(
            "skillId", es.getSkill().getId(),
            "skillName", es.getSkill().getName(),
            "level", es.getLevel()
        ))
        .toList();
  }

  @PostMapping("/skills")
  @PreAuthorize("hasAuthority('EMPLOYEE_SKILLS')")
  public Map<String, Object> upsertSkill(@Valid @RequestBody UpsertSkillRequest req) {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    Skill skill = skills.findById(req.skillId()).orElseThrow(() -> new IllegalArgumentException("Invalid skillId"));

    Optional<EmployeeSkill> existing = employeeSkills.findByEmployeeIdAndSkillId(me.getId(), skill.getId());

    EmployeeSkill es = existing.orElseGet(() -> {
      EmployeeSkill n = new EmployeeSkill();
      n.setEmployee(me);
      n.setSkill(skill);
      return n;
    });
    es.setLevel(req.level());
    es.setUpdatedAt(java.time.Instant.now());
    employeeSkills.save(es);

    return Map.of("status", "SAVED");
  }

  @DeleteMapping("/skills/{skillId}")
  @PreAuthorize("hasAuthority('EMPLOYEE_SKILLS')")
  public Map<String, Object> deleteSkill(@PathVariable("skillId") Long skillId) {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    Optional<EmployeeSkill> existing = employeeSkills.findByEmployeeIdAndSkillId(me.getId(), skillId);
    existing.ifPresent(employeeSkills::delete);
    return Map.of("status", "DELETED");
  }

  public record UpsertSkillRequest(
      @NotNull Long skillId,
      @NotNull SkillLevel level
  ) {
  }
}


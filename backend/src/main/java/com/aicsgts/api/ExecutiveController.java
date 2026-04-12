package com.aicsgts.api;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Role;
import com.aicsgts.domain.TrainingAssignment;
import com.aicsgts.domain.JobRole;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.JobRoleRepository;
import com.aicsgts.repo.ProjectRepository;
import com.aicsgts.repo.TrainingAssignmentRepository;
import com.aicsgts.service.SkillGapService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

  public ExecutiveController(
      AppUserRepository users,
      TrainingAssignmentRepository trainingAssignments,
      ProjectRepository projects,
      SkillGapService skillGapService,
      JobRoleRepository jobRoles
  ) {
    this.users = users;
    this.trainingAssignments = trainingAssignments;
    this.projects = projects;
    this.skillGapService = skillGapService;
    this.jobRoles = jobRoles;
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

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("totalEmployees", employees.size());
    out.put("activeEmployees", activeEmployees);
    out.put("orgReadinessPct", orgReadinessPct);
    out.put("employeesWithCriticalGaps", atRisk);
    out.put("pendingTrainingRequests", pendingTraining);
    out.put("completedTrainingAssignments", completedTraining);
    out.put("activeProjects", projects.count());
    return out;
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
}

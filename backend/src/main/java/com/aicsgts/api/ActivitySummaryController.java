package com.aicsgts.api;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Role;
import com.aicsgts.domain.TrainingAssignment;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.AuditLogRepository;
import com.aicsgts.repo.TrainingAssignmentRepository;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.service.SkillGapService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lightweight role-aware summary for header notifications (badge + short list).
 */
@RestController
@RequestMapping("/api/activity")
public class ActivitySummaryController {

  private final AppUserRepository users;
  private final TrainingAssignmentRepository trainingAssignments;
  private final SkillGapService skillGapService;
  private final AuditLogRepository audit;

  public ActivitySummaryController(
      AppUserRepository users,
      TrainingAssignmentRepository trainingAssignments,
      SkillGapService skillGapService,
      AuditLogRepository audit
  ) {
    this.users = users;
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

  @GetMapping("/summary")
  @PreAuthorize("isAuthenticated()")
  @Transactional(readOnly = true)
  public Map<String, Object> summary() {
    AuthPrincipal p = principal();
    return switch (p.getRole()) {
      case EMPLOYEE -> employeeSummary(p.getUserId());
      case MANAGER -> managerSummary(p.getUserId());
      case HR -> hrSummary();
      case EXECUTIVE -> executiveSummary();
      case ADMIN -> adminSummary();
    };
  }

  private Map<String, Object> employeeSummary(Long userId) {
    AppUser me = users.findById(userId).orElseThrow();
    SkillGapService.SkillGapSummary gaps = skillGapService.computeForEmployee(me);
    int r = gaps.redCount();
    int o = gaps.orangeCount();
    int y = gaps.yellowCount();
    long openTraining = trainingAssignments.findByEmployeeId(userId).stream()
        .filter(ta -> ta.getStatus() != TrainingAssignment.Status.COMPLETED)
        .count();

    int badge = Math.min(99, r + o + y + (int) Math.min(openTraining, 50));
    List<Map<String, String>> items = new ArrayList<>();
    if (r > 0) {
      items.add(item("skill-gaps", "/employee", r + " critical skill gap" + (r == 1 ? "" : "s")));
    }
    if (o > 0) {
      items.add(item("skill-gaps", "/employee", o + " elevated skill gap" + (o == 1 ? "" : "s")));
    }
    if (y > 0 && r == 0 && o == 0) {
      items.add(item("skill-gaps", "/employee", y + " minor skill gap" + (y == 1 ? "" : "s")));
    }
    if (openTraining > 0) {
      items.add(item("training", "/employee", openTraining + " open training item" + (openTraining == 1 ? "" : "s")));
    }
    if (items.isEmpty()) {
      items.add(item("", "/employee", "You're all caught up"));
    }
    return out(badge, items);
  }

  private Map<String, Object> managerSummary(Long userId) {
    AppUser me = users.findById(userId).orElseThrow();
    if (me.getDepartment() == null) {
      List<Map<String, String>> items = List.of(item("", "/manager", "No department assigned"));
      return out(0, items);
    }
    long pending = trainingAssignments.findByStatusAndEmployeeDepartmentId(
        TrainingAssignment.Status.REQUESTED,
        me.getDepartment().getId()
    ).stream()
        .filter(ta -> ta.getEmployee().getRole() == Role.EMPLOYEE)
        .count();
    List<Map<String, String>> items = new ArrayList<>();
    if (pending > 0) {
      items.add(item(
          "approvals",
          "/manager",
          pending + " training request" + (pending == 1 ? "" : "s") + " awaiting your review"
      ));
    } else {
      items.add(item("", "/manager", "No pending training approvals"));
    }
    return out((int) Math.min(99, pending), items);
  }

  private Map<String, Object> hrSummary() {
    long pending = trainingAssignments.findAll().stream()
        .filter(ta -> ta.getStatus() == TrainingAssignment.Status.REQUESTED)
        .count();
    List<Map<String, String>> items = new ArrayList<>();
    if (pending > 0) {
      items.add(item(
          "workflows",
          "/hr",
          pending + " organization-wide training request" + (pending == 1 ? "" : "s")
      ));
    } else {
      items.add(item("", "/hr", "No pending training requests"));
    }
    return out((int) Math.min(99, pending), items);
  }

  private Map<String, Object> executiveSummary() {
    List<Map<String, String>> items = List.of(
        item("", "/executive", "Open the executive dashboard for org-wide readiness and training KPIs")
    );
    return out(0, items);
  }

  private Map<String, Object> adminSummary() {
    long n = audit.countByCreatedAtAfter(Instant.now().minusSeconds(86_400));
    List<Map<String, String>> items = List.of(
        item("", "/admin?tab=audit", n + " audit event" + (n == 1 ? "" : "s") + " in the last 24h")
    );
    return out((int) Math.min(99, n), items);
  }

  private static Map<String, String> item(String hash, String path, String text) {
    Map<String, String> m = new LinkedHashMap<>();
    m.put("text", text);
    m.put("path", path);
    m.put("hash", hash == null ? "" : hash);
    return m;
  }

  private static Map<String, Object> out(int badgeCount, List<Map<String, String>> items) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("badgeCount", badgeCount);
    m.put("items", items);
    return m;
  }
}

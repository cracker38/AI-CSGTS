package com.aicsgts.api;

import com.aicsgts.domain.*;
import com.aicsgts.repo.*;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.service.AuditService;
import com.aicsgts.service.CompliancePackService;
import com.aicsgts.service.SkillHealthPptService;
import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

  private final AppUserRepository users;
  private final DepartmentRepository departments;
  private final JobRoleRepository jobRoles;
  private final SystemConfigRepository config;
  private final AuditLogRepository audit;
  private final AuditService auditService;
  private final PasswordEncoder encoder;
  private final PermissionRepository permissions;
  private final RolePermissionRepository rolePermissions;
  private final LoginEventRepository loginEvents;
  private final CompliancePackService compliancePackService;
  private final SkillHealthPptService skillHealthPptService;

  public AdminController(
      AppUserRepository users,
      DepartmentRepository departments,
      JobRoleRepository jobRoles,
      SystemConfigRepository config,
      AuditLogRepository audit,
      AuditService auditService,
      PasswordEncoder encoder,
      PermissionRepository permissions,
      RolePermissionRepository rolePermissions,
      LoginEventRepository loginEvents,
      CompliancePackService compliancePackService,
      SkillHealthPptService skillHealthPptService
  ) {
    this.users = users;
    this.departments = departments;
    this.jobRoles = jobRoles;
    this.config = config;
    this.audit = audit;
    this.auditService = auditService;
    this.encoder = encoder;
    this.permissions = permissions;
    this.rolePermissions = rolePermissions;
    this.loginEvents = loginEvents;
    this.compliancePackService = compliancePackService;
    this.skillHealthPptService = skillHealthPptService;
  }

  private AuthPrincipal principal() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof AuthPrincipal p)) {
      throw new SecurityException("UNAUTHORIZED");
    }
    return p;
  }

  @PostMapping("/users")
  @PreAuthorize("hasAuthority('ADMIN_USER_MANAGEMENT')")
  public Map<String, Object> createUser(@Valid @RequestBody CreateUserRequest req) {
    if (users.findByEmail(req.email()).isPresent()) {
      return Map.of("error", "EMAIL_ALREADY_EXISTS");
    }

    Department dept = departments.findById(req.departmentId())
        .orElseThrow(() -> new IllegalArgumentException("Invalid departmentId"));

    JobRole jr = req.jobRoleId() == null ? null : jobRoles.findById(req.jobRoleId())
        .orElseThrow(() -> new IllegalArgumentException("Invalid jobRoleId"));

    AppUser u = new AppUser();
    u.setName(req.name());
    u.setEmail(req.email());
    u.setPasswordHash(encoder.encode(req.password()));
    u.setRole(req.role());
    u.setActive(true);
    u.setDepartment(dept);
    u.setJobRole(jr);

    users.save(u);
    auditService.log("ADMIN_CREATE_USER", "email=" + req.email() + ", role=" + req.role());
    return Map.of("status", "CREATED", "userId", u.getId());
  }

  @GetMapping("/stats")
  @PreAuthorize("hasAuthority('ADMIN_USER_MANAGEMENT')")
  @Transactional(readOnly = true)
  public Map<String, Object> adminStats() {
    List<AppUser> all = users.findAll();
    Map<String, Long> usersByRole = new LinkedHashMap<>();
    for (Role r : Role.values()) {
      usersByRole.put(r.name(), 0L);
    }
    for (AppUser u : all) {
      usersByRole.merge(u.getRole().name(), 1L, Long::sum);
    }
    long activeUsers = all.stream().filter(AppUser::isActive).count();
    long audit24h = audit.countByCreatedAtAfter(Instant.now().minusSeconds(86_400));
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("totalUsers", all.size());
    out.put("activeUsers", activeUsers);
    out.put("inactiveUsers", all.size() - activeUsers);
    out.put("usersByRole", usersByRole);
    out.put("departmentCount", departments.count());
    out.put("permissionCount", permissions.count());
    out.put("auditEventsLast24h", audit24h);
    return out;
  }

  @GetMapping("/users")
  @PreAuthorize("hasAuthority('ADMIN_USER_MANAGEMENT')")
  @Transactional(readOnly = true)
  public List<?> listUsers() {
    return users.findAll().stream().map(u -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", u.getId());
      row.put("name", u.getName());
      row.put("email", u.getEmail());
      row.put("role", u.getRole());
      row.put("active", u.isActive());
      row.put("departmentId", u.getDepartment() == null ? null : u.getDepartment().getId());
      row.put("jobRoleId", u.getJobRole() == null ? null : u.getJobRole().getId());
      return row;
    }).toList();
  }

  @PatchMapping("/users/{id}/activate")
  @PreAuthorize("hasAuthority('ADMIN_USER_MANAGEMENT')")
  public Map<String, Object> setActive(@PathVariable("id") Long id, @Valid @RequestBody SetActiveRequest req) {
    AppUser u = users.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
    u.setActive(req.active());
    users.save(u);
    auditService.log("ADMIN_SET_USER_ACTIVE", "userId=" + id + ", active=" + req.active());
    return Map.of("status", "UPDATED");
  }

  @PostMapping("/departments")
  @PreAuthorize("hasAuthority('ADMIN_DEPARTMENTS')")
  public Map<String, Object> createDepartment(@Valid @RequestBody DepartmentRequest req) {
    Department d = new Department();
    d.setName(req.name());
    departments.save(d);
    auditService.log("ADMIN_CREATE_DEPARTMENT", "name=" + req.name());
    return Map.of("status", "CREATED", "departmentId", d.getId());
  }

  @GetMapping("/departments")
  @PreAuthorize("hasAuthority('ADMIN_DEPARTMENTS')")
  @Transactional(readOnly = true)
  public List<?> listDepartments() {
    return departments.findAll().stream().map(d -> Map.of(
        "id", d.getId(),
        "name", d.getName()
    )).toList();
  }

  @GetMapping("/config")
  @PreAuthorize("hasAuthority('ADMIN_CONFIG')")
  public Map<String, Object> getConfig() {
    Optional<SystemConfig> first = config.findAll().stream().findFirst();
    if (first.isEmpty()) {
      SystemConfig sc = new SystemConfig();
      sc.setGapAlertRank(2);
      sc.setScheduledReportingEnabled(false);
      config.save(sc);
      return configPayload(sc);
    }
    return configPayload(first.get());
  }

  private static Map<String, Object> configPayload(SystemConfig sc) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("gapAlertRank", sc.getGapAlertRank());
    payload.put("integrationsJson", sc.getIntegrationsJson() == null ? "" : sc.getIntegrationsJson());
    payload.put("scheduledReportingEnabled", sc.isScheduledReportingEnabled());
    payload.put("reportingRecipientEmail", sc.getReportingRecipientEmail() == null ? "" : sc.getReportingRecipientEmail());
    return payload;
  }

  @PatchMapping("/config")
  @PreAuthorize("hasAuthority('ADMIN_CONFIG')")
  public Map<String, Object> updateConfig(@Valid @RequestBody ConfigRequest req) {
    SystemConfig sc = config.findAll().stream().findFirst().orElseGet(() -> config.save(new SystemConfig()));
    sc.setGapAlertRank(req.gapAlertRank());
    if (req.integrationsJson() != null) {
      sc.setIntegrationsJson(req.integrationsJson().isBlank() ? null : req.integrationsJson());
    }
    if (req.scheduledReportingEnabled() != null) {
      sc.setScheduledReportingEnabled(req.scheduledReportingEnabled());
    }
    if (req.reportingRecipientEmail() != null) {
      sc.setReportingRecipientEmail(req.reportingRecipientEmail().isBlank() ? null : req.reportingRecipientEmail().trim());
    }
    config.save(sc);
    auditService.log("ADMIN_UPDATE_CONFIG", "gapAlertRank=" + req.gapAlertRank());
    return Map.of("status", "UPDATED");
  }

  @GetMapping("/audit/compliance-pack.zip")
  @PreAuthorize("hasAuthority('ADMIN_AUDIT')")
  public ResponseEntity<byte[]> compliancePack() throws Exception {
    byte[] zip = compliancePackService.buildPack();
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=audit-compliance-pack.zip")
        .contentType(MediaType.parseMediaType("application/zip"))
        .body(zip);
  }

  @GetMapping("/reports/skill-health.pptx")
  @PreAuthorize("hasAuthority('ADMIN_CONFIG')")
  public ResponseEntity<byte[]> skillHealthPptx() throws Exception {
    byte[] pptx = skillHealthPptService.buildOrgSkillHealthDeck();
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=skill-health.pptx")
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"))
        .body(pptx);
  }

  @GetMapping("/audit")
  @PreAuthorize("hasAuthority('ADMIN_AUDIT')")
  @Transactional(readOnly = true)
  public Map<String, Object> auditPage(
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "size", defaultValue = "20") int size,
      @RequestParam(name = "q", required = false) String q
  ) {
    int safeSize = Math.min(Math.max(size, 1), 100);
    int safePage = Math.max(page, 0);
    Pageable p = PageRequest.of(safePage, safeSize);
    Page<AuditLog> result = (q == null || q.isBlank())
        ? audit.findAllByOrderByCreatedAtDesc(p)
        : audit.findByActionContainingIgnoreCaseOrderByCreatedAtDesc(q.trim(), p);
    List<Map<String, Object>> content = result.getContent().stream().map(this::auditRow).toList();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("content", content);
    out.put("totalElements", result.getTotalElements());
    out.put("totalPages", result.getTotalPages());
    out.put("number", result.getNumber());
    out.put("size", result.getSize());
    return out;
  }

  private Map<String, Object> auditRow(AuditLog a) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", a.getId());
    row.put("action", a.getAction());
    row.put("details", a.getDetails());
    row.put("createdAt", a.getCreatedAt());
    if (a.getActor() == null) {
      row.put("actor", null);
    } else {
      Map<String, Object> actor = new LinkedHashMap<>();
      actor.put("id", a.getActor().getId());
      actor.put("name", a.getActor().getName());
      actor.put("email", a.getActor().getEmail());
      row.put("actor", actor);
    }
    return row;
  }

  @GetMapping("/audit/recent")
  @PreAuthorize("hasAuthority('ADMIN_AUDIT')")
  @Transactional(readOnly = true)
  public List<?> recentAudit() {
    return audit.findTop100ByOrderByCreatedAtDesc().stream().map(this::auditRow).toList();
  }

  @GetMapping("/login-events")
  @PreAuthorize("hasAuthority('ADMIN_AUDIT')")
  @Transactional(readOnly = true)
  public Map<String, Object> loginEventPage(
      @RequestParam(name = "page", defaultValue = "0") int page,
      @RequestParam(name = "size", defaultValue = "25") int size
  ) {
    int safeSize = Math.min(Math.max(size, 1), 100);
    int safePage = Math.max(page, 0);
    Pageable p = PageRequest.of(safePage, safeSize);
    Page<LoginEvent> result = loginEvents.findAllByOrderByCreatedAtDesc(p);
    List<Map<String, Object>> content = result.getContent().stream().map(this::loginEventRow).toList();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("content", content);
    out.put("totalElements", result.getTotalElements());
    out.put("totalPages", result.getTotalPages());
    out.put("number", result.getNumber());
    out.put("size", result.getSize());
    return out;
  }

  private Map<String, Object> loginEventRow(LoginEvent e) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", e.getId());
    row.put("success", e.isSuccess());
    row.put("emailAttempt", e.getEmailAttempt());
    row.put("ipAddress", e.getIpAddress());
    row.put("userAgent", e.getUserAgent());
    row.put("createdAt", e.getCreatedAt());
    if (e.getUser() == null) {
      row.put("user", null);
    } else {
      Map<String, Object> u = new LinkedHashMap<>();
      u.put("id", e.getUser().getId());
      u.put("name", e.getUser().getName());
      u.put("email", e.getUser().getEmail());
      row.put("user", u);
    }
    return row;
  }

  @PostMapping(value = "/users/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('ADMIN_IMPORT_EXPORT')")
  public Map<String, Object> importUsers(@RequestParam("file") MultipartFile file) throws Exception {
    // Expected CSV headers:
    // name,email,password,role,departmentId,jobRoleId(optional)
    if (file == null || file.isEmpty()) return Map.of("imported", 0);

    int imported = 0;
    try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
      String header = br.readLine(); // consume header
      String line;
      while ((line = br.readLine()) != null) {
        if (line.trim().isEmpty()) continue;
        String[] cols = line.split(",");
        if (cols.length < 5) continue;

        String name = cols[0].trim();
        String email = cols[1].trim();
        String password = cols[2].trim();
        Role role = Role.valueOf(cols[3].trim());
        Long departmentId = Long.valueOf(cols[4].trim());
        Long jobRoleId = cols.length >= 6 && !cols[5].trim().isEmpty() ? Long.valueOf(cols[5].trim()) : null;

        if (users.findByEmail(email).isPresent()) continue;

        Department dept = departments.findById(departmentId).orElse(null);
        if (dept == null) continue;
        JobRole jr = jobRoleId == null ? null : jobRoles.findById(jobRoleId).orElse(null);

        AppUser u = new AppUser();
        u.setName(name);
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(password));
        u.setRole(role);
        u.setActive(true);
        u.setDepartment(dept);
        u.setJobRole(jr);
        users.save(u);
        imported++;
      }
    }

    auditService.log("ADMIN_IMPORT_USERS", "imported=" + imported);
    return Map.of("imported", imported);
  }

  public record CreateUserRequest(
      @NotBlank String name,
      @Email @NotBlank String email,
      @NotBlank String password,
      @NotNull Role role,
      @NotNull Long departmentId,
      @Nullable Long jobRoleId
  ) {
  }

  public record SetActiveRequest(@NotNull Boolean active) {}

  public record DepartmentRequest(@NotBlank String name) {}

  public record ConfigRequest(
      @NotNull Integer gapAlertRank,
      @Nullable String integrationsJson,
      @Nullable Boolean scheduledReportingEnabled,
      @Nullable String reportingRecipientEmail
  ) {}

  @GetMapping("/permissions")
  @PreAuthorize("hasAuthority('ADMIN_CONFIG')")
  @Transactional(readOnly = true)
  public List<?> listPermissions() {
    return permissions.findAll().stream().map(p -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", p.getId());
      row.put("code", p.getCode());
      row.put("description", p.getDescription());
      return row;
    }).toList();
  }

  @PostMapping("/permissions")
  @PreAuthorize("hasAuthority('ADMIN_CONFIG')")
  public Map<String, Object> createPermission(@Valid @RequestBody PermissionRequest req) {
    if (permissions.findByCode(req.code()).isPresent()) {
      return Map.of("status", "ALREADY_EXISTS");
    }
    Permission p = new Permission();
    p.setCode(req.code());
    p.setDescription(req.description() == null ? "" : req.description());
    permissions.save(p);
    auditService.log("ADMIN_CREATE_PERMISSION", "code=" + req.code());
    return Map.of("status", "CREATED", "permissionId", p.getId());
  }

  @GetMapping("/role-permissions/{role}")
  @PreAuthorize("hasAuthority('ADMIN_CONFIG')")
  @Transactional(readOnly = true)
  public Map<String, Object> rolePermissions(@PathVariable("role") Role role) {
    return Map.of("role", role, "permissionCodes", rolePermissions.findPermissionCodesByRole(role));
  }

  @PostMapping("/role-permissions/{role}")
  @PreAuthorize("hasAuthority('ADMIN_CONFIG')")
  public Map<String, Object> setRolePermissions(@PathVariable("role") Role role, @Valid @RequestBody RolePermissionsRequest req) {
    // Replace mapping atomically in MVP.
    rolePermissions.deleteByRole(role);
    for (String code : req.permissionCodes()) {
      Permission perm = permissions.findByCode(code).orElseThrow(() -> new IllegalArgumentException("Unknown permission code: " + code));
      RolePermission rp = new RolePermission();
      rp.setRole(role);
      rp.setPermission(perm);
      rolePermissions.save(rp);
    }
    auditService.log("ADMIN_SET_ROLE_PERMISSIONS", "role=" + role);
    return Map.of("status", "UPDATED");
  }

  public record PermissionRequest(
      @NotBlank String code,
      String description
  ) {}

  public record RolePermissionsRequest(
      List<@NotBlank String> permissionCodes
  ) {}
}


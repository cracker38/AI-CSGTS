package com.aicsgts.api;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Department;
import com.aicsgts.domain.EmployeeCertification;
import com.aicsgts.domain.EmployeeSkill;
import com.aicsgts.domain.JobRole;
import com.aicsgts.domain.Role;
import com.aicsgts.domain.Skill;
import com.aicsgts.domain.SkillLevel;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.DepartmentRepository;
import com.aicsgts.repo.EmployeeCertificationRepository;
import com.aicsgts.repo.EmployeeSkillRepository;
import com.aicsgts.repo.JobRoleRepository;
import com.aicsgts.repo.SkillRepository;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.security.JwtService;
import com.aicsgts.service.CertificationStorageService;
import com.aicsgts.service.LoginAuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AppUserRepository users;
  private final DepartmentRepository departments;
  private final JobRoleRepository jobRoles;
  private final SkillRepository skills;
  private final EmployeeSkillRepository employeeSkills;
  private final EmployeeCertificationRepository certifications;
  private final CertificationStorageService certificationStorage;
  private final PasswordEncoder encoder;
  private final JwtService jwtService;
  private final LoginAuditService loginAudit;

  public AuthController(
      AppUserRepository users,
      DepartmentRepository departments,
      JobRoleRepository jobRoles,
      SkillRepository skills,
      EmployeeSkillRepository employeeSkills,
      EmployeeCertificationRepository certifications,
      CertificationStorageService certificationStorage,
      PasswordEncoder encoder,
      JwtService jwtService,
      LoginAuditService loginAudit
  ) {
    this.users = users;
    this.departments = departments;
    this.jobRoles = jobRoles;
    this.skills = skills;
    this.employeeSkills = employeeSkills;
    this.certifications = certifications;
    this.certificationStorage = certificationStorage;
    this.encoder = encoder;
    this.jwtService = jwtService;
    this.loginAudit = loginAudit;
  }

  /**
   * Public self-registration for {@link Role#EMPLOYEE} only.
   * {@link Role#MANAGER}, {@link Role#HR}, {@link Role#EXECUTIVE}, and {@link Role#ADMIN} are created by an administrator
   * ({@code POST /api/admin/users}).
   * Employees must declare a {@link JobRole} so competency and gap analysis can run.
   */
  @PostMapping("/register")
  @Transactional
  public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
    if (req.role() != Role.EMPLOYEE) {
      return ResponseEntity.badRequest().body(Map.of("error", "REGISTER_EMPLOYEE_ONLY"));
    }
    if (req.jobRoleId() == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "JOB_ROLE_REQUIRED_FOR_EMPLOYEE"));
    }
    if (req.initialSkills() == null || req.initialSkills().isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "INITIAL_SKILL_REQUIRED"));
    }
    boolean hasCv = req.cvText() != null && !req.cvText().isBlank();
    boolean hasCareerGoals = req.careerGoalsText() != null && !req.careerGoalsText().isBlank();
    if (!hasCv && !hasCareerGoals) {
      return ResponseEntity.badRequest().body(Map.of("error", "CV_OR_CAREER_GOALS_REQUIRED"));
    }
    if (users.findByEmail(req.email()).isPresent()) {
      return ResponseEntity.badRequest().body(Map.of("error", "EMAIL_ALREADY_EXISTS"));
    }

    Department dept = departments.findById(req.departmentId()).orElse(null);
    if (dept == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "INVALID_DEPARTMENT_ID"));
    }

    JobRole jobRole = jobRoles.findById(req.jobRoleId()).orElse(null);
    if (jobRole == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "INVALID_JOB_ROLE_ID"));
    }

    AppUser user = new AppUser();
    user.setName(req.name());
    user.setEmail(req.email());
    user.setPasswordHash(encoder.encode(req.password()));
    user.setRole(req.role());
    user.setActive(true);
    user.setDepartment(dept);
    user.setJobRole(jobRole);
    if (req.cvText() != null && !req.cvText().isBlank()) {
      user.setCvText(clamp(req.cvText().trim(), 12000));
      user.setCvUpdatedAt(Instant.now());
    }
    if (req.careerGoalsText() != null && !req.careerGoalsText().isBlank()) {
      user.setCareerGoalsText(clamp(req.careerGoalsText().trim(), 2000));
    }

    users.save(user);
    int savedSkills = persistInitialSkills(user, req.initialSkills());
    int savedCerts = persistInitialCertifications(user, req.initialCertifications());
    if ((savedSkills > 0 || savedCerts > 0) && user.getCvUpdatedAt() == null) {
      user.setCvUpdatedAt(Instant.now());
      users.save(user);
    }
    return ResponseEntity.ok(Map.of(
        "status", "REGISTERED",
        "role", req.role(),
        "savedSkills", savedSkills,
        "savedCertifications", savedCerts
    ));
  }

  private int persistInitialSkills(AppUser user, List<RegisterSkillInput> entries) {
    if (entries == null || entries.isEmpty()) return 0;
    int count = 0;
    for (RegisterSkillInput s : entries) {
      if (s == null || s.skillId() == null || s.level() == null) continue;
      Skill skill = skills.findById(s.skillId()).orElse(null);
      if (skill == null) continue;
      EmployeeSkill es = employeeSkills.findByEmployeeIdAndSkillId(user.getId(), skill.getId()).orElseGet(() -> {
        EmployeeSkill n = new EmployeeSkill();
        n.setEmployee(user);
        n.setSkill(skill);
        return n;
      });
      es.setLevel(s.level());
      es.setUpdatedAt(Instant.now());
      employeeSkills.save(es);
      count++;
    }
    return count;
  }

  private int persistInitialCertifications(AppUser user, List<RegisterCertificationInput> entries) {
    if (entries == null || entries.isEmpty()) return 0;
    int count = 0;
    for (RegisterCertificationInput c : entries) {
      if (c == null || c.title() == null || c.title().isBlank()) continue;
      try {
        byte[] evidenceBytes;
        String contentType = "text/plain";
        String fileName = "registration-cert-" + UUID.randomUUID() + ".txt";
        if (c.evidenceBase64() != null && !c.evidenceBase64().isBlank()) {
          evidenceBytes = Base64.getDecoder().decode(c.evidenceBase64());
          if (c.contentType() != null && !c.contentType().isBlank()) contentType = c.contentType().trim();
          if (c.fileName() != null && !c.fileName().isBlank()) fileName = c.fileName().trim();
        } else {
          String summary = "Declared during registration\nTitle: " + c.title() + "\nIssuer: " + (c.issuer() == null ? "" : c.issuer());
          evidenceBytes = summary.getBytes(StandardCharsets.UTF_8);
        }
        String storagePath = certificationStorage.storeFile(user.getId(), fileName, evidenceBytes);
        EmployeeCertification ec = new EmployeeCertification();
        ec.setEmployee(user);
        ec.setTitle(clamp(c.title().trim(), 500));
        ec.setIssuer(c.issuer() == null || c.issuer().isBlank() ? null : clamp(c.issuer().trim(), 500));
        if (c.expiresAt() != null && !c.expiresAt().isBlank()) {
          ec.setExpiresAt(Instant.parse(c.expiresAt()));
        }
        ec.setFileName(fileName);
        ec.setContentType(contentType);
        ec.setStoragePath(storagePath);
        ec.setFileSize(evidenceBytes.length);
        certifications.save(ec);
        count++;
      } catch (Exception ignored) {
      }
    }
    return count;
  }

  private static String clamp(String s, int max) {
    if (s == null) return null;
    return s.length() <= max ? s : s.substring(0, max);
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
    AppUser user = users.findByEmail(req.email()).orElse(null);
    if (user == null || !user.isActive() || !encoder.matches(req.password(), user.getPasswordHash())) {
      loginAudit.recordAttempt(user, req.email(), false, http);
      return ResponseEntity.status(401).body(Map.of("error", "INVALID_CREDENTIALS"));
    }

    loginAudit.recordAttempt(user, req.email(), true, http);

    boolean remember = Boolean.TRUE.equals(req.rememberMe());
    String token = jwtService.generateToken(
        user.getId(), user.getEmail(), user.getName(), user.getRole(), remember
    );
    return ResponseEntity.ok(Map.of(
        "token", token,
        "user", Map.of(
            "id", user.getId(),
            "name", user.getName(),
            "email", user.getEmail(),
            "role", user.getRole()
        )
    ));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof AuthPrincipal principal)) {
      return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
    }

    AppUser user = users.findById(principal.getUserId()).orElse(null);
    if (user == null) return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));

    // Map.of(...) throws NullPointerException when any value is null (can happen for legacy/seeded rows).
    Map<String, Object> out = new java.util.LinkedHashMap<>();
    out.put("id", user.getId());
    out.put("name", user.getName());
    out.put("email", user.getEmail());
    out.put("role", user.getRole());
    out.put("departmentId", user.getDepartment() == null ? null : user.getDepartment().getId());
    out.put("jobRoleId", user.getJobRole() == null ? null : user.getJobRole().getId());
    return ResponseEntity.ok(out);
  }

  public record RegisterRequest(
      @NotBlank String name,
      @Email @NotBlank String email,
      @NotBlank @Size(min = 8, max = 100) String password,
      @NotNull Role role,
      @NotNull Long departmentId,
      @Nullable Long jobRoleId,
      @Nullable String cvText,
      @Nullable String careerGoalsText,
      @Nullable List<RegisterSkillInput> initialSkills,
      @Nullable List<RegisterCertificationInput> initialCertifications
  ) {
  }

  public record RegisterSkillInput(
      @Nullable Long skillId,
      @Nullable SkillLevel level
  ) {
  }

  public record RegisterCertificationInput(
      @Nullable String title,
      @Nullable String issuer,
      @Nullable String expiresAt,
      @Nullable String fileName,
      @Nullable String contentType,
      @Nullable String evidenceBase64
  ) {
  }

  public record LoginRequest(
      @Email @NotBlank String email,
      @NotBlank String password,
      Boolean rememberMe
  ) {
  }
}


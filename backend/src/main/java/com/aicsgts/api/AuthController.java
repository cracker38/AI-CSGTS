package com.aicsgts.api;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Department;
import com.aicsgts.domain.JobRole;
import com.aicsgts.domain.Role;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.DepartmentRepository;
import com.aicsgts.repo.JobRoleRepository;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.security.JwtService;
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
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AppUserRepository users;
  private final DepartmentRepository departments;
  private final JobRoleRepository jobRoles;
  private final PasswordEncoder encoder;
  private final JwtService jwtService;
  private final LoginAuditService loginAudit;

  public AuthController(
      AppUserRepository users,
      DepartmentRepository departments,
      JobRoleRepository jobRoles,
      PasswordEncoder encoder,
      JwtService jwtService,
      LoginAuditService loginAudit
  ) {
    this.users = users;
    this.departments = departments;
    this.jobRoles = jobRoles;
    this.encoder = encoder;
    this.jwtService = jwtService;
    this.loginAudit = loginAudit;
  }

  /**
   * Public self-registration for leadership roles only ({@link Role#MANAGER}, {@link Role#HR}).
   * Employees are provisioned by an administrator ({@code POST /api/admin/users}).
   */
  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
    if (req.role() != Role.MANAGER && req.role() != Role.HR) {
      return ResponseEntity.badRequest().body(Map.of("error", "REGISTER_STAFF_ONLY"));
    }
    if (users.findByEmail(req.email()).isPresent()) {
      return ResponseEntity.badRequest().body(Map.of("error", "EMAIL_ALREADY_EXISTS"));
    }

    Department dept = departments.findById(req.departmentId())
        .orElseThrow(() -> new IllegalArgumentException("Invalid departmentId"));

    JobRole jobRole = req.jobRoleId() == null ? null : jobRoles.findById(req.jobRoleId())
        .orElseThrow(() -> new IllegalArgumentException("Invalid jobRoleId"));

    AppUser user = new AppUser();
    user.setName(req.name());
    user.setEmail(req.email());
    user.setPasswordHash(encoder.encode(req.password()));
    user.setRole(req.role());
    user.setActive(true);
    user.setDepartment(dept);
    user.setJobRole(jobRole);

    users.save(user);
    return ResponseEntity.ok(Map.of(
        "status", "REGISTERED",
        "role", req.role()
    ));
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
      @Nullable Long jobRoleId
  ) {
  }

  public record LoginRequest(
      @Email @NotBlank String email,
      @NotBlank String password,
      Boolean rememberMe
  ) {
  }
}


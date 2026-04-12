package com.aicsgts.api;

import com.aicsgts.domain.*;
import com.aicsgts.repo.*;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.service.CertificationStorageService;
import com.aicsgts.service.EmployeeAiInsightService;
import com.aicsgts.service.SkillGapService;
import com.aicsgts.service.TrainingRecommendationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
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
  private final EmployeeCertificationRepository certifications;
  private final ManagerSkillAssessmentRepository managerAssessments;
  private final CertificationStorageService certificationStorage;
  private final EmployeeAiInsightService employeeAiInsightService;

  public EmployeeController(
      AppUserRepository users,
      SkillRepository skills,
      EmployeeSkillRepository employeeSkills,
      RequiredSkillRepository requiredSkills,
      TrainingAssignmentRepository trainingAssignments,
      SkillGapService skillGapService,
      TrainingRecommendationService trainingRecommendationService,
      EmployeeCertificationRepository certifications,
      ManagerSkillAssessmentRepository managerAssessments,
      CertificationStorageService certificationStorage,
      EmployeeAiInsightService employeeAiInsightService
  ) {
    this.users = users;
    this.skills = skills;
    this.employeeSkills = employeeSkills;
    this.requiredSkills = requiredSkills;
    this.trainingAssignments = trainingAssignments;
    this.skillGapService = skillGapService;
    this.trainingRecommendationService = trainingRecommendationService;
    this.certifications = certifications;
    this.managerAssessments = managerAssessments;
    this.certificationStorage = certificationStorage;
    this.employeeAiInsightService = employeeAiInsightService;
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

    List<Map<String, Object>> notifications = new ArrayList<>();
    for (TrainingAssignment a : myAssignments) {
      if (notifications.size() >= 10) break;
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("assignmentId", a.getId());
      row.put("programId", a.getProgram().getId());
      row.put("type", "TRAINING");
      row.put("programTitle", a.getProgram().getTitle());
      row.put("status", a.getStatus().name());
      row.put("requestedAt", a.getRequestedAt());
      row.put("reviewedAt", a.getReviewedAt());
      notifications.add(row);
    }

    Map<String, Object> profile = new LinkedHashMap<>();
    profile.put("id", me.getId());
    profile.put("name", me.getName());
    profile.put("email", me.getEmail());
    profile.put("role", me.getRole().name());
    profile.put("departmentId", me.getDepartment() == null ? null : me.getDepartment().getId());
    profile.put("departmentName", me.getDepartment() == null ? null : me.getDepartment().getName());
    profile.put("jobRoleId", me.getJobRole() == null ? null : me.getJobRole().getId());
    profile.put("jobRoleName", me.getJobRole() == null ? null : me.getJobRole().getName());

    Map<String, Object> counts = new LinkedHashMap<>();
    counts.put("green", gaps.greenCount());
    counts.put("yellow", gaps.yellowCount());
    counts.put("orange", gaps.orangeCount());
    counts.put("red", gaps.redCount());

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("profile", profile);
    out.put("profileCompleteness", profileCompleteness(me, gaps));
    out.put("skills", employeeSkills.findByEmployeeId(me.getId()).stream().map(es -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("skillId", es.getSkill().getId());
      row.put("skillName", es.getSkill().getName());
      row.put("category", es.getSkill().getCategory() == null ? "" : es.getSkill().getCategory());
      row.put("level", es.getLevel());
      return row;
    }).toList());
    out.put("skillGapAnalysis", Map.of("gaps", gaps.gaps(), "counts", counts));
    out.put("trainingRecommendations", Map.of(
        "items", recommendations.items(),
        "careerSuggestions", recommendations.careerSuggestions(),
        "gapTrends", recommendations.gapTrends()
    ));
    out.put("notifications", notifications);

    out.put("certifications", certifications.findByEmployeeIdOrderByCreatedAtDesc(me.getId()).stream().map(c -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", c.getId());
      row.put("title", c.getTitle());
      row.put("issuer", c.getIssuer());
      row.put("expiresAt", c.getExpiresAt());
      row.put("fileName", c.getFileName());
      row.put("fileSize", c.getFileSize());
      row.put("createdAt", c.getCreatedAt());
      return row;
    }).toList());

    out.put("managerAssessments", managerAssessments.findByEmployee_IdOrderByCreatedAtDesc(me.getId()).stream()
        .limit(20)
        .map(a -> {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("id", a.getId());
          row.put("managerName", a.getManager().getName());
          row.put("skillName", a.getSkill().getName());
          row.put("assessedLevel", a.getAssessedLevel());
          row.put("note", a.getNote());
          row.put("createdAt", a.getCreatedAt());
          return row;
        })
        .toList());

    String jobRoleName = me.getJobRole() == null ? null : me.getJobRole().getName();
    out.put("aiInsights", employeeAiInsightService.build(gaps, jobRoleName));

    return out;
  }

  /** Simple 0–100 score: org placement + share of role requirements already green. */
  private static int profileCompleteness(AppUser me, SkillGapService.SkillGapSummary gaps) {
    int score = 0;
    if (me.getDepartment() != null) {
      score += 20;
    }
    if (me.getJobRole() != null) {
      score += 20;
    }
    int n = gaps.greenCount() + gaps.yellowCount() + gaps.orangeCount() + gaps.redCount();
    if (n == 0) {
      score += 60;
    } else {
      score += (int) Math.round(60.0 * gaps.greenCount() / n);
    }
    return Math.min(100, score);
  }

  @GetMapping("/available-skills")
  @PreAuthorize("hasAuthority('EMPLOYEE_SKILLS')")
  @Transactional(readOnly = true)
  public List<?> availableSkills() {
    return skills.findAll().stream().map(s -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", s.getId());
      row.put("name", s.getName());
      row.put("category", s.getCategory() == null ? "" : s.getCategory());
      return row;
    }).toList();
  }

  @GetMapping("/skills")
  @PreAuthorize("hasAuthority('EMPLOYEE_SKILLS')")
  @Transactional(readOnly = true)
  public List<?> mySkills() {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    return employeeSkills.findByEmployeeId(me.getId()).stream().map(es -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("skillId", es.getSkill().getId());
      row.put("skillName", es.getSkill().getName());
      row.put("category", es.getSkill().getCategory() == null ? "" : es.getSkill().getCategory());
      row.put("level", es.getLevel());
      return row;
    }).toList();
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

  @GetMapping("/certifications")
  @PreAuthorize("hasAuthority('EMPLOYEE_DASHBOARD')")
  @Transactional(readOnly = true)
  public List<?> listCertifications() {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    return certifications.findByEmployeeIdOrderByCreatedAtDesc(me.getId()).stream().map(c -> {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", c.getId());
      row.put("title", c.getTitle());
      row.put("issuer", c.getIssuer());
      row.put("expiresAt", c.getExpiresAt());
      row.put("fileName", c.getFileName());
      row.put("fileSize", c.getFileSize());
      row.put("createdAt", c.getCreatedAt());
      return row;
    }).toList();
  }

  @PostMapping(value = "/certifications", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('EMPLOYEE_DASHBOARD')")
  @Transactional
  public Map<String, Object> uploadCertification(
      @RequestParam("title") String title,
      @RequestParam(value = "issuer", required = false) String issuer,
      @RequestParam(value = "expiresAt", required = false) String expiresAt,
      @RequestParam("file") MultipartFile file
  ) throws Exception {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    if (title == null || title.isBlank()) {
      throw new IllegalArgumentException("title required");
    }
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("file required");
    }
    byte[] bytes = file.getBytes();
    if (bytes.length > 4_000_000) {
      throw new IllegalArgumentException("FILE_TOO_LARGE");
    }
    String path = certificationStorage.storeFile(me.getId(), file.getOriginalFilename(), bytes);
    EmployeeCertification c = new EmployeeCertification();
    c.setEmployee(me);
    c.setTitle(title.trim());
    c.setIssuer(issuer == null || issuer.isBlank() ? null : issuer.trim());
    if (expiresAt != null && !expiresAt.isBlank()) {
      c.setExpiresAt(Instant.parse(expiresAt));
    }
    c.setFileName(file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename());
    c.setContentType(file.getContentType());
    c.setStoragePath(path);
    c.setFileSize(bytes.length);
    certifications.save(c);
    return Map.of("status", "UPLOADED", "id", c.getId());
  }

  @GetMapping("/certifications/{id}/file")
  @PreAuthorize("hasAuthority('EMPLOYEE_DASHBOARD')")
  @Transactional(readOnly = true)
  public ResponseEntity<byte[]> downloadCertification(@PathVariable("id") Long id) throws Exception {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    EmployeeCertification c = certifications.findById(id).orElseThrow(() -> new IllegalArgumentException("Not found"));
    if (!c.getEmployee().getId().equals(me.getId())) {
      throw new SecurityException("FORBIDDEN");
    }
    byte[] data = certificationStorage.readFile(c.getStoragePath());
    String ct = c.getContentType() != null ? c.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + c.getFileName().replace("\"", "") + "\"")
        .contentType(MediaType.parseMediaType(ct))
        .body(data);
  }

  @DeleteMapping("/certifications/{id}")
  @PreAuthorize("hasAuthority('EMPLOYEE_DASHBOARD')")
  @Transactional
  public Map<String, Object> deleteCertification(@PathVariable("id") Long id) throws Exception {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    EmployeeCertification c = certifications.findById(id).orElseThrow(() -> new IllegalArgumentException("Not found"));
    if (!c.getEmployee().getId().equals(me.getId())) {
      throw new SecurityException("FORBIDDEN");
    }
    certificationStorage.deleteFile(c.getStoragePath());
    certifications.delete(c);
    return Map.of("status", "DELETED");
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


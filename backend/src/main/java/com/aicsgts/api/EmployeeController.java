package com.aicsgts.api;

import com.aicsgts.domain.*;
import com.aicsgts.repo.*;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.service.CertificationStorageService;
import com.aicsgts.service.CvTextExtractionService;
import com.aicsgts.service.EmployeeAiInsightService;
import com.aicsgts.service.EmployeeCompetencyAnalysisService;
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
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/employee")
public class EmployeeController {
  private static final Set<String> ALLOWED_CERT_CONTENT_TYPES = Set.of(
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg"
  );
  private static final Set<String> ALLOWED_CV_CONTENT_TYPES = Set.of(
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

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
  private final CvTextExtractionService cvTextExtractionService;
  private final EmployeeAiInsightService employeeAiInsightService;
  private final EmployeeCompetencyAnalysisService employeeCompetencyAnalysisService;

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
      CvTextExtractionService cvTextExtractionService,
      EmployeeAiInsightService employeeAiInsightService,
      EmployeeCompetencyAnalysisService employeeCompetencyAnalysisService
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
    this.cvTextExtractionService = cvTextExtractionService;
    this.employeeAiInsightService = employeeAiInsightService;
    this.employeeCompetencyAnalysisService = employeeCompetencyAnalysisService;
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
    List<EmployeeSkill> mySkills = employeeSkills.findByEmployeeId(me.getId());
    List<EmployeeCertification> myCerts = certifications.findByEmployeeIdOrderByCreatedAtDesc(me.getId());
    List<ManagerSkillAssessment> myAssessments = managerAssessments.findByEmployee_IdOrderByCreatedAtDesc(me.getId());

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
    profile.put("cvFileName", me.getCvFileName());
    profile.put("cvUpdatedAt", me.getCvUpdatedAt());
    profile.put("careerGoalsText", me.getCareerGoalsText());

    Map<String, Object> counts = new LinkedHashMap<>();
    counts.put("green", gaps.greenCount());
    counts.put("yellow", gaps.yellowCount());
    counts.put("orange", gaps.orangeCount());
    counts.put("red", gaps.redCount());

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("profile", profile);
    int completeness = profileCompleteness(me, mySkills, myCerts);
    out.put("profileCompleteness", completeness);
    out.put("profileCompletenessScore", completeness);
    out.put("profileMetrics", buildProfileMetrics(me, mySkills, myCerts));
    out.put("skills", mySkills.stream().map(es -> {
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

    out.put("certifications", myCerts.stream().map(c -> {
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
    Map<String, Object> cv = new LinkedHashMap<>();
    cv.put("fileName", me.getCvFileName());
    cv.put("updatedAt", me.getCvUpdatedAt());
    cv.put("careerGoalsText", me.getCareerGoalsText());
    cv.put("textAvailable", me.getCvText() != null && !me.getCvText().isBlank());
    out.put("cv", cv);

    out.put("managerAssessments", myAssessments.stream()
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
    out.put("skillConfidence", buildSkillConfidence(mySkills, myAssessments, myCerts));
    out.put("reminders", buildReminders(completeness, latestProfileUpdate(mySkills, myCerts, myAssessments), myCerts));
    out.put("workflow", buildWorkflow(gaps, recommendations.items(), myAssessments));
    out.put("aiInsights", employeeAiInsightService.build(
        gaps,
        jobRoleName,
        recommendations.careerSuggestions(),
        recommendations.gapTrends()
    ));
    out.put("competencyAnalysis", employeeCompetencyAnalysisService.analyze(
        me,
        mySkills,
        myCerts,
        myAssessments,
        gaps,
        recommendations
    ));

    return out;
  }

  @GetMapping("/competency-analysis")
  @PreAuthorize("hasAuthority('EMPLOYEE_DASHBOARD')")
  @Transactional(readOnly = true)
  public Map<String, Object> competencyAnalysis() {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    var gaps = skillGapService.computeForEmployee(me);
    var recommendations = trainingRecommendationService.recommendForEmployee(gaps);
    List<EmployeeSkill> mySkills = employeeSkills.findByEmployeeId(me.getId());
    List<EmployeeCertification> myCerts = certifications.findByEmployeeIdOrderByCreatedAtDesc(me.getId());
    List<ManagerSkillAssessment> myAssessments = managerAssessments.findByEmployee_IdOrderByCreatedAtDesc(me.getId());
    return employeeCompetencyAnalysisService.analyze(me, mySkills, myCerts, myAssessments, gaps, recommendations);
  }

  /** Formal score: (filled_fields / total_fields) * 100 with weighted profile essentials. */
  private static int profileCompleteness(AppUser me, List<EmployeeSkill> mySkills, List<EmployeeCertification> myCerts) {
    int total = 5;
    int filled = 0;
    if (me.getName() != null && !me.getName().isBlank()) filled++;
    if (me.getDepartment() != null) filled++;
    if (me.getJobRole() != null) filled++;
    if (!mySkills.isEmpty()) filled++;
    if (!myCerts.isEmpty()) filled++;
    return (int) Math.round((filled * 100.0) / total);
  }

  private static Map<String, Object> buildProfileMetrics(AppUser me, List<EmployeeSkill> mySkills, List<EmployeeCertification> myCerts) {
    int total = 5;
    int filled = 0;
    if (me.getName() != null && !me.getName().isBlank()) filled++;
    if (me.getDepartment() != null) filled++;
    if (me.getJobRole() != null) filled++;
    if (!mySkills.isEmpty()) filled++;
    if (!myCerts.isEmpty()) filled++;
    return Map.of(
        "filledFields", filled,
        "totalFields", total,
        "formula", "completeness = (filled_fields / total_fields) * 100"
    );
  }

  private static Map<String, Object> buildSkillConfidence(
      List<EmployeeSkill> mySkills,
      List<ManagerSkillAssessment> myAssessments,
      List<EmployeeCertification> myCerts
  ) {
    double selfAssessment = avgSkillLevel(mySkills.stream().map(EmployeeSkill::getLevel).toList());
    double managerRating = avgSkillLevel(myAssessments.stream().map(ManagerSkillAssessment::getAssessedLevel).toList());
    double endorsements = myCerts.isEmpty() ? 50.0 : Math.min(100.0, 55.0 + (myCerts.size() * 7.5));
    int confidence = (int) Math.round((selfAssessment + endorsements + managerRating) / 3.0);
    return Map.of(
        "score", Math.max(0, Math.min(100, confidence)),
        "selfAssessment", round(selfAssessment),
        "endorsements", round(endorsements),
        "managerRating", round(managerRating),
        "formula", "confidence = (self_assessment + endorsements + manager_rating) / 3"
    );
  }

  private static double avgSkillLevel(List<SkillLevel> levels) {
    if (levels == null || levels.isEmpty()) return 50.0;
    double sum = levels.stream().mapToDouble(l -> switch (l) {
      case BEGINNER -> 25.0;
      case INTERMEDIATE -> 55.0;
      case ADVANCED -> 80.0;
      case EXPERT -> 95.0;
    }).sum();
    return sum / levels.size();
  }

  private static int round(double v) {
    return (int) Math.round(v);
  }

  private static Instant latestProfileUpdate(
      List<EmployeeSkill> mySkills,
      List<EmployeeCertification> myCerts,
      List<ManagerSkillAssessment> myAssessments
  ) {
    List<Instant> stamps = new ArrayList<>();
    mySkills.stream().map(EmployeeSkill::getUpdatedAt).filter(x -> x != null).forEach(stamps::add);
    myCerts.stream().map(EmployeeCertification::getCreatedAt).filter(x -> x != null).forEach(stamps::add);
    myAssessments.stream().map(ManagerSkillAssessment::getCreatedAt).filter(x -> x != null).forEach(stamps::add);
    return stamps.stream().max(Comparator.naturalOrder()).orElse(null);
  }

  private static List<Map<String, Object>> buildReminders(
      int profileCompleteness,
      Instant lastUpdate,
      List<EmployeeCertification> myCerts
  ) {
    List<Map<String, Object>> out = new ArrayList<>();
    if (profileCompleteness < 80) {
      out.add(Map.of(
          "code", "PROFILE_COMPLETENESS_LOW",
          "severity", "WARN",
          "message", "Profile is below 80% complete. Add missing profile fields, skills, or certifications."
      ));
    }
    if (lastUpdate == null || lastUpdate.isBefore(Instant.now().minus(90, ChronoUnit.DAYS))) {
      out.add(Map.of(
          "code", "PROFILE_STALE",
          "severity", "WARN",
          "message", "Profile was not updated in the last 90 days. Refresh your skills and certifications."
      ));
    }
    Instant now = Instant.now();
    long expiringSoon = myCerts == null ? 0 : myCerts.stream()
        .map(EmployeeCertification::getExpiresAt)
        .filter(x -> x != null && !x.isBefore(now) && !x.isAfter(now.plus(30, ChronoUnit.DAYS)))
        .count();
    long expired = myCerts == null ? 0 : myCerts.stream()
        .map(EmployeeCertification::getExpiresAt)
        .filter(x -> x != null && x.isBefore(now))
        .count();
    if (expired > 0) {
      out.add(Map.of(
          "code", "CERTIFICATION_EXPIRED",
          "severity", "HIGH",
          "message", "You have %d expired certification(s). Renew to keep competency evidence current.".formatted(expired)
      ));
    }
    if (expiringSoon > 0) {
      out.add(Map.of(
          "code", "CERTIFICATION_EXPIRING_SOON",
          "severity", "WARN",
          "message", "You have %d certification(s) expiring within 30 days. Plan renewal now.".formatted(expiringSoon)
      ));
    }
    return out;
  }

  private static Map<String, Object> buildWorkflow(
      SkillGapService.SkillGapSummary gaps,
      List<TrainingRecommendationService.RecommendedTraining> recs,
      List<ManagerSkillAssessment> myAssessments
  ) {
    boolean hasGaps = (gaps.redCount() + gaps.orangeCount() + gaps.yellowCount()) > 0;
    return Map.of(
        "steps", List.of(
            "Update Skills",
            "AI Validation",
            "Manager Review",
            "Gap Recalculation",
            "Training Recommendation"
        ),
        "updateSkills", true,
        "aiValidation", true,
        "managerReview", !myAssessments.isEmpty(),
        "gapRecalculation", hasGaps || gaps.greenCount() > 0,
        "trainingRecommendation", !recs.isEmpty()
    );
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
    String contentType = file.getContentType() == null ? "" : file.getContentType().trim().toLowerCase();
    if (!ALLOWED_CERT_CONTENT_TYPES.contains(contentType)) {
      throw new IllegalArgumentException("INVALID_CERT_FILE_TYPE");
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
    c.setContentType(contentType);
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

  @GetMapping("/cv")
  @PreAuthorize("hasAuthority('EMPLOYEE_DASHBOARD')")
  @Transactional(readOnly = true)
  public Map<String, Object> cvInfo() {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("fileName", me.getCvFileName());
    out.put("updatedAt", me.getCvUpdatedAt());
    out.put("careerGoalsText", me.getCareerGoalsText());
    out.put("textAvailable", me.getCvText() != null && !me.getCvText().isBlank());
    return out;
  }

  @PostMapping(value = "/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasAuthority('EMPLOYEE_DASHBOARD')")
  @Transactional
  public Map<String, Object> uploadCv(
      @RequestParam(value = "file", required = false) MultipartFile file,
      @RequestParam(value = "careerGoals", required = false) String careerGoals
  ) throws Exception {
    AuthPrincipal p = principal();
    AppUser me = users.findById(p.getUserId()).orElseThrow(() -> new SecurityException("UNAUTHORIZED"));
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("CV_FILE_REQUIRED");
    }
    byte[] bytes = file.getBytes();
    if (bytes.length > 4_000_000) {
      throw new IllegalArgumentException("FILE_TOO_LARGE");
    }
    String contentType = file.getContentType() == null ? "" : file.getContentType().trim().toLowerCase();
    if (!contentType.isBlank() && !ALLOWED_CV_CONTENT_TYPES.contains(contentType)) {
      throw new IllegalArgumentException("INVALID_CV_FILE_TYPE");
    }
    String path = certificationStorage.storeCvFile(me.getId(), file.getOriginalFilename(), bytes);
    me.setCvFileName(file.getOriginalFilename() == null ? "cv-upload" : file.getOriginalFilename());
    me.setCvStoragePath(path);
    String extractedText = cvTextExtractionService.extract(bytes, contentType, file.getOriginalFilename());
    me.setCvText(extractedText.isBlank() ? null : extractedText);
    if (careerGoals != null) {
      String goals = careerGoals.trim();
      if (goals.length() > 2000) goals = goals.substring(0, 2000);
      me.setCareerGoalsText(goals.isBlank() ? null : goals);
    }
    me.setCvUpdatedAt(Instant.now());
    users.save(me);
    return Map.of(
        "status", "CV_SAVED",
        "fileName", me.getCvFileName(),
        "updatedAt", me.getCvUpdatedAt(),
        "textAvailable", me.getCvText() != null && !me.getCvText().isBlank()
    );
  }

  public record UpsertSkillRequest(
      @NotNull Long skillId,
      @NotNull SkillLevel level
  ) {
  }
}


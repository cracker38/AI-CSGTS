package com.aicsgts.service;

import com.aicsgts.config.AiProperties;
import com.aicsgts.domain.Department;
import com.aicsgts.domain.EmployeeCertification;
import com.aicsgts.domain.Permission;
import com.aicsgts.domain.Role;
import com.aicsgts.domain.SystemConfig;
import com.aicsgts.domain.TrainingAssignment;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.DepartmentRepository;
import com.aicsgts.repo.EmployeeCertificationRepository;
import com.aicsgts.repo.EmployeeSkillRepository;
import com.aicsgts.repo.ManagerSkillAssessmentRepository;
import com.aicsgts.repo.PermissionRepository;
import com.aicsgts.repo.ProjectRepository;
import com.aicsgts.repo.RequiredSkillRepository;
import com.aicsgts.repo.RolePermissionRepository;
import com.aicsgts.repo.SkillRepository;
import com.aicsgts.repo.SystemConfigRepository;
import com.aicsgts.repo.TrainingAssignmentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class SystemIntelligenceService {

  private static final Set<String> ALLOWED_CERT_CONTENT_TYPES = Set.of(
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg"
  );

  private final SystemConfigRepository configRepository;
  private final DepartmentRepository departments;
  private final PermissionRepository permissions;
  private final RolePermissionRepository rolePermissions;
  private final SkillRepository skills;
  private final EmployeeCertificationRepository certifications;
  private final AppUserRepository users;
  private final EmployeeSkillRepository employeeSkills;
  private final ManagerSkillAssessmentRepository managerAssessments;
  private final RequiredSkillRepository requiredSkills;
  private final TrainingAssignmentRepository trainingAssignments;
  private final ProjectRepository projects;
  private final IntegrationHealthService integrationHealthService;
  private final AiProperties aiProperties;
  private final ObjectMapper objectMapper;

  public SystemIntelligenceService(
      SystemConfigRepository configRepository,
      DepartmentRepository departments,
      PermissionRepository permissions,
      RolePermissionRepository rolePermissions,
      SkillRepository skills,
      EmployeeCertificationRepository certifications,
      AppUserRepository users,
      EmployeeSkillRepository employeeSkills,
      ManagerSkillAssessmentRepository managerAssessments,
      RequiredSkillRepository requiredSkills,
      TrainingAssignmentRepository trainingAssignments,
      ProjectRepository projects,
      IntegrationHealthService integrationHealthService,
      AiProperties aiProperties,
      ObjectMapper objectMapper
  ) {
    this.configRepository = configRepository;
    this.departments = departments;
    this.permissions = permissions;
    this.rolePermissions = rolePermissions;
    this.skills = skills;
    this.certifications = certifications;
    this.users = users;
    this.employeeSkills = employeeSkills;
    this.managerAssessments = managerAssessments;
    this.requiredSkills = requiredSkills;
    this.trainingAssignments = trainingAssignments;
    this.projects = projects;
    this.integrationHealthService = integrationHealthService;
    this.aiProperties = aiProperties;
    this.objectMapper = objectMapper;
  }

  public Map<String, Object> snapshot() {
    SystemConfig cfg = configRepository.findAll().stream().findFirst().orElseGet(SystemConfig::new);
    Map<String, Object> cfgJson = parseJson(cfg.getIntegrationsJson());
    Map<String, Integer> deptThresholds = parseDepartmentThresholds(cfgJson.get("departmentGapThresholds"));
    Map<String, Object> integrationHealth = integrationHealthService.check();

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("checkedAt", Instant.now());
    out.put("rbac", buildRbacMatrix());
    out.put("dynamicThresholdEngine", buildThresholdView(cfg.getGapAlertRank(), deptThresholds));
    out.put("dataIntegrity", buildIntegrityView());
    out.put("aiGovernance", buildAiGovernanceView(cfgJson));
    out.put("systemHealth", Map.of("integrations", integrationHealth));
    out.put("crossRoleIntelligentFlow", buildCrossRoleFlow());
    out.put("coreArchitecture", buildCoreArchitecture(integrationHealth, cfgJson));
    return out;
  }

  public Map<String, Object> upsertDepartmentThresholds(Map<String, Integer> updates) {
    SystemConfig cfg = configRepository.findAll().stream().findFirst().orElseGet(() -> configRepository.save(new SystemConfig()));
    Map<String, Object> cfgJson = parseJson(cfg.getIntegrationsJson());
    Map<String, Integer> current = parseDepartmentThresholds(cfgJson.get("departmentGapThresholds"));
    for (Map.Entry<String, Integer> e : updates.entrySet()) {
      Integer v = e.getValue();
      if (v == null) continue;
      int clamped = Math.max(0, Math.min(10, v));
      current.put(e.getKey(), clamped);
    }
    cfgJson.put("departmentGapThresholds", current);
    cfg.setIntegrationsJson(writeJson(cfgJson));
    configRepository.save(cfg);
    return buildThresholdView(cfg.getGapAlertRank(), current);
  }

  private Map<String, Object> buildRbacMatrix() {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("permissionCount", permissions.count());
    Map<String, List<Map<String, Object>>> matrix = new LinkedHashMap<>();
    List<Permission> allPerms = permissions.findAll();
    for (Role role : Role.values()) {
      Set<String> granted = new LinkedHashSet<>(rolePermissions.findPermissionCodesByRole(role));
      List<Map<String, Object>> rows = new ArrayList<>();
      for (Permission p : allPerms) {
        if (!granted.contains(p.getCode())) continue;
        rows.add(permissionRow(p.getCode()));
      }
      matrix.put(role.name(), rows);
    }
    out.put("matrix", matrix);
    return out;
  }

  private static Map<String, Object> permissionRow(String code) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("permissionCode", code);
    String[] parts = code.split("_");
    String resource = parts.length >= 2 ? parts[0] + "_" + parts[1] : code;
    String action = parts.length >= 3 ? parts[parts.length - 1] : "READ";
    row.put("resource", resource);
    row.put("action", action);
    return row;
  }

  private Map<String, Object> buildThresholdView(int global, Map<String, Integer> deptThresholds) {
    List<Map<String, Object>> effective = new ArrayList<>();
    for (Department d : departments.findAll()) {
      Integer t = deptThresholds.get(String.valueOf(d.getId()));
      effective.add(Map.of(
          "departmentId", d.getId(),
          "departmentName", d.getName(),
          "threshold", t == null ? global : t
      ));
    }
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("globalGapThreshold", global);
    out.put("departmentGapThresholds", deptThresholds);
    out.put("effectiveThresholds", effective);
    return out;
  }

  private Map<String, Object> buildIntegrityView() {
    Map<String, List<String>> byLower = new LinkedHashMap<>();
    skills.findAll().forEach(s -> {
      String key = s.getName() == null ? "" : s.getName().trim().toLowerCase(Locale.ROOT);
      byLower.computeIfAbsent(key, k -> new ArrayList<>()).add(s.getName());
    });
    List<List<String>> dupGroups = byLower.values().stream().filter(v -> v.size() > 1).toList();

    List<EmployeeCertification> certs = certifications.findAll();
    long invalidContentType = certs.stream().filter(c -> {
      String ct = c.getContentType() == null ? "" : c.getContentType().toLowerCase(Locale.ROOT).trim();
      return !ct.isEmpty() && !ALLOWED_CERT_CONTENT_TYPES.contains(ct);
    }).count();
    long oversized = certs.stream().filter(c -> c.getFileSize() > 4_000_000).count();

    return Map.of(
        "duplicateSkillNameGroups", dupGroups,
        "invalidCertificationContentTypeCount", invalidContentType,
        "oversizedCertificationCount", oversized
    );
  }

  private Map<String, Object> buildAiGovernanceView(Map<String, Object> cfgJson) {
    Number accuracyTarget = asNumber(cfgJson.get("aiAccuracyTargetPct"), 85);
    Number biasThreshold = asNumber(cfgJson.get("aiBiasAlertThresholdPct"), 10);
    return Map.of(
        "model", aiProperties.getModel(),
        "llmActive", aiProperties.isLlmActive(),
        "jsonResponseFormat", aiProperties.isJsonResponseFormat(),
        "forceDisabled", aiProperties.isForceDisabled(),
        "accuracyTargetPct", accuracyTarget.intValue(),
        "biasAlertThresholdPct", biasThreshold.intValue()
    );
  }

  private Map<String, Object> parseJson(String json) {
    if (json == null || json.isBlank()) return new LinkedHashMap<>();
    try {
      return objectMapper.readValue(json, new TypeReference<>() {});
    } catch (Exception e) {
      return new LinkedHashMap<>();
    }
  }

  private String writeJson(Map<String, Object> data) {
    try {
      return objectMapper.writeValueAsString(data);
    } catch (Exception e) {
      return "{}";
    }
  }

  private static Map<String, Integer> parseDepartmentThresholds(Object raw) {
    Map<String, Integer> out = new LinkedHashMap<>();
    if (raw instanceof Map<?, ?> m) {
      for (Map.Entry<?, ?> e : m.entrySet()) {
        String k = String.valueOf(e.getKey());
        Number n = asNumber(e.getValue(), null);
        if (n != null) out.put(k, Math.max(0, Math.min(10, n.intValue())));
      }
    }
    return out;
  }

  private static Number asNumber(Object o, Integer fallback) {
    if (o instanceof Number n) return n;
    try {
      if (o != null) return Integer.parseInt(String.valueOf(o));
    } catch (Exception ignored) {
    }
    return fallback;
  }

  private Map<String, Object> buildCrossRoleFlow() {
    long employeeInput = employeeSkills.count();
    long managerValidation = managerAssessments.count();
    long hrAnalysis = requiredSkills.count();
    long aiPrediction = users.count();
    long executiveDecision = projects.count();
    long adminOptimization = permissions.count();
    return Map.of(
        "flow", List.of("Employee Input", "Manager Validation", "HR Analysis", "AI Prediction", "Executive Decision", "Admin Optimization"),
        "stages", List.of(
            stage("Employee Input", employeeInput),
            stage("Manager Validation", managerValidation),
            stage("HR Analysis", hrAnalysis),
            stage("AI Prediction", aiPrediction),
            stage("Executive Decision", executiveDecision),
            stage("Admin Optimization", adminOptimization)
        ),
        "closedLoopSummary", "Measures skills, detects gaps, predicts future needs, recommends actions, and evaluates outcomes."
    );
  }

  private Map<String, Object> buildCoreArchitecture(Map<String, Object> integrationHealth, Map<String, Object> cfgJson) {
    Map<String, Object> lms = new LinkedHashMap<>();
    lms.put("coursera", endpointStatus(asText(cfgJson.get("courseraBaseUrl"))));
    lms.put("udemy", endpointStatus(asText(cfgJson.get("udemyBaseUrl"))));
    Map<String, Object> pmTools = new LinkedHashMap<>();
    pmTools.put("jira", integrationHealth.get("jira"));
    pmTools.put("asana", integrationHealth.get("asana"));
    return Map.of(
        "skillOntologyFramework", List.of("SFIA", "ITIL"),
        "aiEngineLayers", List.of(
            Map.of("name", "Data Layer", "scope", "Profiles, Projects"),
            Map.of("name", "Processing Layer", "scope", "Gap Analysis"),
            Map.of("name", "Intelligence Layer", "scope", "Predictions"),
            Map.of("name", "Recommendation Layer", "scope", "Training, Staffing")
        ),
        "integrationEcosystem", Map.of(
            "lms", lms,
            "pmTools", pmTools
        )
    );
  }

  private static Map<String, Object> stage(String name, long volume) {
    return Map.of(
        "name", name,
        "volume", volume,
        "status", volume > 0 ? "ACTIVE" : "PENDING"
    );
  }

  private static Map<String, Object> endpointStatus(String url) {
    if (url == null || url.isBlank()) return Map.of("configured", false, "status", "NOT_CONFIGURED");
    return Map.of("configured", true, "status", "CONFIGURED", "target", url);
  }

  private static String asText(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }
}

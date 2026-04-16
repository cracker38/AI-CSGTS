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
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmployeeControllerDashboardContractTest {

  @Test
  void dashboard_containsProfessionalAutonomousFields() {
    AppUserRepository users = mock(AppUserRepository.class);
    SkillRepository skills = mock(SkillRepository.class);
    EmployeeSkillRepository employeeSkills = mock(EmployeeSkillRepository.class);
    RequiredSkillRepository requiredSkills = mock(RequiredSkillRepository.class);
    TrainingAssignmentRepository trainingAssignments = mock(TrainingAssignmentRepository.class);
    SkillGapService skillGapService = mock(SkillGapService.class);
    TrainingRecommendationService trainingRecommendationService = mock(TrainingRecommendationService.class);
    EmployeeCertificationRepository certifications = mock(EmployeeCertificationRepository.class);
    ManagerSkillAssessmentRepository managerAssessments = mock(ManagerSkillAssessmentRepository.class);
    CertificationStorageService certificationStorage = mock(CertificationStorageService.class);
    CvTextExtractionService cvTextExtractionService = mock(CvTextExtractionService.class);
    EmployeeAiInsightService employeeAiInsightService = mock(EmployeeAiInsightService.class);
    EmployeeCompetencyAnalysisService employeeCompetencyAnalysisService = mock(EmployeeCompetencyAnalysisService.class);

    EmployeeController controller = new EmployeeController(
        users,
        skills,
        employeeSkills,
        requiredSkills,
        trainingAssignments,
        skillGapService,
        trainingRecommendationService,
        certifications,
        managerAssessments,
        certificationStorage,
        cvTextExtractionService,
        employeeAiInsightService,
        employeeCompetencyAnalysisService
    );

    Department dep = new Department();
    dep.setId(10L);
    dep.setName("Engineering");
    JobRole jr = new JobRole();
    jr.setId(20L);
    jr.setName("Backend Engineer");

    AppUser me = new AppUser();
    me.setId(1L);
    me.setName("Employee One");
    me.setEmail("employee@example.com");
    me.setRole(Role.EMPLOYEE);
    me.setDepartment(dep);
    me.setJobRole(jr);

    EmployeeSkill es = new EmployeeSkill();
    Skill sk = new Skill();
    sk.setId(100L);
    sk.setName("Java");
    sk.setCategory("Backend");
    es.setEmployee(me);
    es.setSkill(sk);
    es.setLevel(SkillLevel.INTERMEDIATE);
    es.setUpdatedAt(Instant.now().minusSeconds(5 * 24 * 3600));

    EmployeeCertification cert = new EmployeeCertification();
    cert.setId(200L);
    cert.setEmployee(me);
    cert.setTitle("Java Cert");
    cert.setCreatedAt(Instant.now().minusSeconds(8 * 24 * 3600));
    cert.setContentType("application/pdf");
    cert.setStoragePath("certifications/1/a.pdf");
    cert.setFileName("a.pdf");
    cert.setFileSize(1024);

    ManagerSkillAssessment msa = new ManagerSkillAssessment();
    msa.setId(300L);
    msa.setEmployee(me);
    msa.setManager(me);
    msa.setSkill(sk);
    msa.setAssessedLevel(SkillLevel.ADVANCED);
    msa.setCreatedAt(Instant.now().minusSeconds(3 * 24 * 3600));

    SkillGapService.SkillGapSummary gaps = new SkillGapService.SkillGapSummary(
        List.of(new SkillGapService.SkillGapItem(
            100L, "Java", "Backend", SkillLevel.ADVANCED, SkillLevel.INTERMEDIATE, 1, "YELLOW"
        )),
        0, 1, 0, 0
    );

    TrainingRecommendationService.RecommendationSummary recs = new TrainingRecommendationService.RecommendationSummary(
        List.of(new TrainingRecommendationService.RecommendedTraining(
            9L, "Core Java Path", "desc", "Provider", "ONLINE", 100L, "YELLOW", false
        )),
        List.of("Grow toward senior backend ownership."),
        Map.of("YELLOW", 1)
    );

    when(users.findById(1L)).thenReturn(Optional.of(me));
    when(employeeSkills.findByEmployeeId(1L)).thenReturn(List.of(es));
    when(certifications.findByEmployeeIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(cert));
    when(managerAssessments.findByEmployee_IdOrderByCreatedAtDesc(1L)).thenReturn(List.of(msa));
    when(trainingAssignments.findByEmployeeId(1L)).thenReturn(List.of());
    when(skillGapService.computeForEmployee(me)).thenReturn(gaps);
    when(trainingRecommendationService.recommendForEmployee(gaps)).thenReturn(recs);
    when(employeeAiInsightService.build(gaps, "Backend Engineer", recs.careerSuggestions(), recs.gapTrends()))
        .thenReturn(Map.of("model", "heuristic-readiness-v1", "confidencePct", 77));
    when(employeeCompetencyAnalysisService.analyze(me, List.of(es), List.of(cert), List.of(msa), gaps, recs))
        .thenReturn(Map.of("readinessStatus", Map.of("status", "NEEDS_IMPROVEMENT")));

    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(new AuthPrincipal(1L, "employee@example.com", "Employee One", Role.EMPLOYEE), null, List.of())
    );
    try {
      Map<String, Object> out = controller.dashboard();
      assertTrue(out.containsKey("profileCompleteness"));
      assertTrue(out.containsKey("profileCompletenessScore"));
      assertTrue(out.containsKey("profileMetrics"));
      assertTrue(out.containsKey("skillConfidence"));
      assertTrue(out.containsKey("reminders"));
      assertTrue(out.containsKey("workflow"));
      assertTrue(out.containsKey("competencyAnalysis"));

      @SuppressWarnings("unchecked")
      Map<String, Object> profileMetrics = (Map<String, Object>) out.get("profileMetrics");
      assertEquals("completeness = (filled_fields / total_fields) * 100", profileMetrics.get("formula"));

      @SuppressWarnings("unchecked")
      Map<String, Object> skillConfidence = (Map<String, Object>) out.get("skillConfidence");
      assertEquals("confidence = (self_assessment + endorsements + manager_rating) / 3", skillConfidence.get("formula"));

      @SuppressWarnings("unchecked")
      Map<String, Object> workflow = (Map<String, Object>) out.get("workflow");
      assertEquals(Boolean.TRUE, workflow.get("updateSkills"));
      assertEquals(Boolean.TRUE, workflow.get("aiValidation"));
      assertEquals(Boolean.TRUE, workflow.get("managerReview"));
      assertEquals(Boolean.TRUE, workflow.get("trainingRecommendation"));
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}

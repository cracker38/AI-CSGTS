package com.aicsgts.service;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.JobRole;
import com.aicsgts.domain.Role;
import com.aicsgts.repo.AppUserRepository;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SkillHealthPptServiceTest {

  @Test
  void buildOrgSkillHealthDeck_producesReadablePptx() throws Exception {
    AppUserRepository users = mock(AppUserRepository.class);
    SkillGapService skillGapService = mock(SkillGapService.class);
    SkillHealthPptService service = new SkillHealthPptService(users, skillGapService);

    AppUser employee = new AppUser();
    employee.setId(1L);
    employee.setRole(Role.EMPLOYEE);
    employee.setActive(true);
    JobRole role = new JobRole();
    role.setId(1L);
    role.setName("Software Engineer");
    employee.setJobRole(role);

    when(users.findByRoleOrderByNameAsc(Role.EMPLOYEE)).thenReturn(List.of(employee));
    when(skillGapService.computeForEmployee(employee)).thenReturn(
        new SkillGapService.SkillGapSummary(List.of(), 3, 1, 0, 0)
    );

    byte[] out = service.buildOrgSkillHealthDeck();
    assertTrue(out.length > 0);
    assertEquals('P', out[0]);
    assertEquals('K', out[1]);

    try (XMLSlideShow ppt = new XMLSlideShow(new ByteArrayInputStream(out))) {
      assertEquals(1, ppt.getSlides().size());
      String text = ppt.getSlides().get(0).getShapes().stream()
          .filter(s -> s instanceof org.apache.poi.xslf.usermodel.XSLFTextShape)
          .map(s -> ((org.apache.poi.xslf.usermodel.XSLFTextShape) s).getText())
          .reduce("", (a, b) -> a + "\n" + b);
      assertTrue(text.contains("AI-CSGTS"));
    }
  }
}

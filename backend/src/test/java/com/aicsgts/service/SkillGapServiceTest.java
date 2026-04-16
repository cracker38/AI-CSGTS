package com.aicsgts.service;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.EmployeeSkill;
import com.aicsgts.domain.RequiredSkill;
import com.aicsgts.domain.Skill;
import com.aicsgts.domain.SkillLevel;
import com.aicsgts.repo.EmployeeSkillRepository;
import com.aicsgts.repo.RequiredSkillRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class SkillGapServiceTest {

  @Test
  void computeForEmployee_classifiesSeverityAndCounts() {
    SkillGapService service = new SkillGapService(
        mock(RequiredSkillRepository.class),
        mock(EmployeeSkillRepository.class)
    );

    Skill greenSkill = skill(1L, "Communication");
    Skill yellowSkill = skill(2L, "Spring Boot");
    Skill orangeSkill = skill(3L, "System Design");
    Skill redSkill = skill(4L, "Kubernetes");

    List<RequiredSkill> required = List.of(
        required(greenSkill, SkillLevel.BEGINNER),
        required(yellowSkill, SkillLevel.ADVANCED),
        required(orangeSkill, SkillLevel.EXPERT),
        required(redSkill, SkillLevel.ADVANCED)
    );

    AppUser employee = new AppUser();
    employee.setId(100L);

    List<EmployeeSkill> current = List.of(
        employeeSkill(employee, greenSkill, SkillLevel.BEGINNER),
        employeeSkill(employee, yellowSkill, SkillLevel.INTERMEDIATE),
        employeeSkill(employee, orangeSkill, SkillLevel.INTERMEDIATE)
    );

    SkillGapService.SkillGapSummary summary = service.computeForEmployee(employee, required, current);
    Map<Long, String> colors = summary.gaps().stream().collect(Collectors.toMap(SkillGapService.SkillGapItem::skillId, SkillGapService.SkillGapItem::color));

    assertEquals(1, summary.greenCount());
    assertEquals(1, summary.yellowCount());
    assertEquals(1, summary.orangeCount());
    assertEquals(1, summary.redCount());
    assertEquals("GREEN", colors.get(1L));
    assertEquals("YELLOW", colors.get(2L));
    assertEquals("ORANGE", colors.get(3L));
    assertEquals("RED", colors.get(4L));
  }

  private static Skill skill(Long id, String name) {
    Skill skill = new Skill();
    skill.setId(id);
    skill.setName(name);
    return skill;
  }

  private static RequiredSkill required(Skill skill, SkillLevel level) {
    RequiredSkill req = new RequiredSkill();
    req.setSkill(skill);
    req.setRequiredLevel(level);
    return req;
  }

  private static EmployeeSkill employeeSkill(AppUser employee, Skill skill, SkillLevel level) {
    EmployeeSkill es = new EmployeeSkill();
    es.setEmployee(employee);
    es.setSkill(skill);
    es.setLevel(level);
    return es;
  }
}

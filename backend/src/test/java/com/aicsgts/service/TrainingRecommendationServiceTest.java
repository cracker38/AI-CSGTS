package com.aicsgts.service;

import com.aicsgts.domain.SkillLevel;
import com.aicsgts.domain.SystemConfig;
import com.aicsgts.domain.TrainingDeliveryFormat;
import com.aicsgts.domain.TrainingProgram;
import com.aicsgts.repo.SystemConfigRepository;
import com.aicsgts.repo.TrainingProgramRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TrainingRecommendationServiceTest {

  @Test
  void recommendForEmployee_marksPriorityUsingConfiguredThreshold() {
    TrainingProgramRepository trainingPrograms = mock(TrainingProgramRepository.class);
    SystemConfigRepository configRepository = mock(SystemConfigRepository.class);
    TrainingRecommendationService service = new TrainingRecommendationService(trainingPrograms, configRepository);

    SystemConfig cfg = new SystemConfig();
    cfg.setGapAlertRank(2);
    when(configRepository.findAll()).thenReturn(List.of(cfg));

    when(trainingPrograms.findBySkillId(10L)).thenReturn(List.of(program(1L, "Spring Upskilling", SkillLevel.ADVANCED)));
    when(trainingPrograms.findBySkillId(20L)).thenReturn(List.of(program(2L, "Cloud Foundations", SkillLevel.EXPERT)));

    SkillGapService.SkillGapSummary summary = new SkillGapService.SkillGapSummary(
        List.of(
            new SkillGapService.SkillGapItem(10L, "Spring", "Backend", SkillLevel.ADVANCED, SkillLevel.INTERMEDIATE, 1, "YELLOW"),
            new SkillGapService.SkillGapItem(20L, "Cloud", "Infra", SkillLevel.EXPERT, SkillLevel.BEGINNER, 3, "RED")
        ),
        0, 1, 0, 1
    );

    TrainingRecommendationService.RecommendationSummary out = service.recommendForEmployee(summary);

    assertEquals(2, out.items().size());
    assertFalse(out.items().stream().filter(i -> i.skillId().equals(10L)).findFirst().orElseThrow().priority());
    assertTrue(out.items().stream().filter(i -> i.skillId().equals(20L)).findFirst().orElseThrow().priority());
    assertEquals(1, out.gapTrends().get("YELLOW"));
    assertEquals(1, out.gapTrends().get("RED"));
  }

  private static TrainingProgram program(Long id, String title, SkillLevel targetLevel) {
    TrainingProgram p = new TrainingProgram();
    p.setId(id);
    p.setTitle(title);
    p.setDescription(title + " description");
    p.setProvider("Internal Academy");
    p.setDeliveryFormat(TrainingDeliveryFormat.ONLINE);
    p.setTargetLevel(targetLevel);
    return p;
  }
}

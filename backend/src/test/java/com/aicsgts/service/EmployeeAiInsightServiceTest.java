package com.aicsgts.service;

import com.aicsgts.config.AiProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EmployeeAiInsightServiceTest {

  @Test
  void build_usesHeuristicFallbackWhenLlmUnavailable() {
    LlmClientService llm = mock(LlmClientService.class);
    when(llm.chat(anyString(), anyString())).thenReturn(Optional.empty());

    AiProperties props = new AiProperties();
    EmployeeAiInsightService service = new EmployeeAiInsightService(llm, new ObjectMapper(), props);

    SkillGapService.SkillGapSummary gaps = summaryWithOrangeAndRed();
    Map<String, Object> out = service.build(gaps, "Backend Engineer");

    assertEquals("heuristic", out.get("source"));
    assertEquals("heuristic-readiness-v1", out.get("model"));
    assertEquals("elevated", out.get("decayRisk"));
    assertTrue(((String) out.get("forecastNote")).contains("Skill gap snapshot"));
    assertTrue(((List<?>) out.get("priorityFocus")).size() >= 1);
  }

  @Test
  void build_usesLlmPayloadWhenValidJsonReturned() {
    LlmClientService llm = mock(LlmClientService.class);
    when(llm.chat(anyString(), anyString())).thenReturn(Optional.of("""
        {"coachingSummary":"Focus on cloud and API maturity.","priorityFocus":["Cloud","API Design"],"nextStep":"Complete one cloud lab this week.","marketNote":"No external feed configured."}
        """));

    AiProperties props = new AiProperties();
    props.setModel("gpt-4o-mini");
    EmployeeAiInsightService service = new EmployeeAiInsightService(llm, new ObjectMapper(), props);

    SkillGapService.SkillGapSummary gaps = summaryWithOrangeAndRed();
    Map<String, Object> out = service.build(gaps, "Platform Engineer");

    assertEquals("hybrid", out.get("source"));
    assertEquals("gpt-4o-mini", out.get("model"));
    assertEquals("Complete one cloud lab this week.", out.get("nextStep"));
    assertEquals("No external feed configured.", out.get("marketNote"));
  }

  private static SkillGapService.SkillGapSummary summaryWithOrangeAndRed() {
    return new SkillGapService.SkillGapSummary(
        List.of(
            new SkillGapService.SkillGapItem(10L, "Cloud", "Infra", com.aicsgts.domain.SkillLevel.EXPERT, com.aicsgts.domain.SkillLevel.INTERMEDIATE, 2, "ORANGE"),
            new SkillGapService.SkillGapItem(20L, "API Design", "Backend", com.aicsgts.domain.SkillLevel.ADVANCED, com.aicsgts.domain.SkillLevel.BEGINNER, 3, "RED")
        ),
        0, 0, 1, 1
    );
  }
}

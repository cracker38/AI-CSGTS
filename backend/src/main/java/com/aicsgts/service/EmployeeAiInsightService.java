package com.aicsgts.service;

import com.aicsgts.config.AiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Employee dashboard AI block: always includes heuristics; enriches with an LLM when configured.
 */
@Service
public class EmployeeAiInsightService {

  private static final String SYSTEM = """
      You are a concise workforce skills coach for employees. You only output valid JSON, no markdown.
      Schema: {"coachingSummary":"2-3 sentences","priorityFocus":["up to 5 short skill or theme names"],"nextStep":"one actionable sentence","marketNote":"one sentence; say if you lack external data"}
      Be practical and supportive. Do not invent employer policies.""";

  private final LlmClientService llm;
  private final ObjectMapper objectMapper;
  private final AiProperties aiProperties;

  public EmployeeAiInsightService(LlmClientService llm, ObjectMapper objectMapper, AiProperties aiProperties) {
    this.llm = llm;
    this.objectMapper = objectMapper;
    this.aiProperties = aiProperties;
  }

  public Map<String, Object> build(SkillGapService.SkillGapSummary gaps, String jobRoleName) {
    Map<String, Object> ai = new LinkedHashMap<>();
    String decayRisk = gaps.redCount() > 0 ? "elevated" : "low";
    int conf = 50 + Math.min(45, gaps.greenCount() * 8);
    int confidencePct = Math.min(96, conf);

    ai.put("decayRisk", decayRisk);
    ai.put("confidencePct", confidencePct);
    ai.put("forecastNote", "Heuristic baseline — attach workforce market feeds for external demand signals.");

    boolean usedLlm = false;
    Optional<String> raw = llm.chat(SYSTEM, buildUserPayload(gaps, jobRoleName));
    if (raw.isPresent()) {
      try {
        JsonNode node = objectMapper.readTree(raw.get());
        usedLlm = true;
        ai.put("model", aiProperties.getModel());
        ai.put("source", "hybrid");
        putIfText(ai, "coachingSummary", node.path("coachingSummary"));
        putIfText(ai, "nextStep", node.path("nextStep"));
        putIfText(ai, "marketNote", node.path("marketNote"));
        if (node.path("priorityFocus").isArray()) {
          List<String> focus = new ArrayList<>();
          for (JsonNode x : node.path("priorityFocus")) {
            if (x.isTextual() && !x.asText().isBlank()) {
              focus.add(x.asText().trim());
            }
          }
          if (!focus.isEmpty()) {
            ai.put("priorityFocus", focus);
          }
        }
        String coaching = (String) ai.get("coachingSummary");
        if (coaching != null && !coaching.isBlank()) {
          ai.put("forecastNote", coaching);
        }
      } catch (Exception ignored) {
        usedLlm = false;
      }
    }

    if (!usedLlm) {
      ai.put("model", "heuristic-readiness-v1");
      ai.put("source", "heuristic");
    }

    return ai;
  }

  private static void putIfText(Map<String, Object> ai, String key, JsonNode n) {
    if (n.isTextual()) {
      String t = n.asText().trim();
      if (!t.isBlank()) {
        ai.put(key, t);
      }
    }
  }

  private static String buildUserPayload(SkillGapService.SkillGapSummary gaps, String jobRoleName) {
    List<SkillGapService.SkillGapItem> hot = gaps.gaps().stream()
        .filter(g -> "RED".equals(g.color()) || "ORANGE".equals(g.color()))
        .limit(8)
        .collect(Collectors.toList());
    StringBuilder sb = new StringBuilder();
    sb.append("Job role: ").append(jobRoleName == null || jobRoleName.isBlank() ? "(none assigned)" : jobRoleName).append('\n');
    sb.append("Gap counts — green:").append(gaps.greenCount())
        .append(" yellow:").append(gaps.yellowCount())
        .append(" orange:").append(gaps.orangeCount())
        .append(" red:").append(gaps.redCount()).append('\n');
    if (hot.isEmpty()) {
      sb.append("No critical/orange gaps listed — employee may be on track or have no role requirements.");
    } else {
      sb.append("Largest gaps to mention:\n");
      for (SkillGapService.SkillGapItem g : hot) {
        sb.append("- ").append(g.skillName())
            .append(" (required ").append(g.requiredLevel()).append(", current ").append(g.currentLevel())
            .append(", ").append(g.color()).append(")\n");
      }
    }
    return sb.toString();
  }
}

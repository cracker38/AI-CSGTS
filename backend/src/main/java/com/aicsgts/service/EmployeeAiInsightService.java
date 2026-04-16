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
      You are a concise workforce skills coach for IT employees in a competency tracking system. Output ONLY valid JSON, no markdown or prose outside JSON.
      Schema: {"coachingSummary":"2-3 sentences grounded in the gap data provided","priorityFocus":["up to 5 short skill or theme names from the gaps"],"nextStep":"one actionable sentence","marketNote":"one sentence; state you have no external labor-market feed if applicable"}
      Ground advice in the listed skills and levels only. Do not invent employer policies, salaries, or promotions. Be professional and supportive.""";

  private final LlmClientService llm;
  private final ObjectMapper objectMapper;
  private final AiProperties aiProperties;

  public EmployeeAiInsightService(LlmClientService llm, ObjectMapper objectMapper, AiProperties aiProperties) {
    this.llm = llm;
    this.objectMapper = objectMapper;
    this.aiProperties = aiProperties;
  }

  public Map<String, Object> build(SkillGapService.SkillGapSummary gaps, String jobRoleName) {
    return build(gaps, jobRoleName, List.of(), Map.of());
  }

  public Map<String, Object> build(
      SkillGapService.SkillGapSummary gaps,
      String jobRoleName,
      List<String> careerGoals,
      Map<String, Integer> marketDemandTrends
  ) {
    Map<String, Object> ai = new LinkedHashMap<>();
    String decayRisk = gaps.redCount() > 0 ? "elevated" : "low";
    int conf = 50 + Math.min(45, gaps.greenCount() * 8);
    int confidencePct = Math.min(96, conf);

    ai.put("decayRisk", decayRisk);
    ai.put("confidencePct", confidencePct);

    boolean usedLlm = false;
    Optional<String> raw = llm.chat(SYSTEM, buildUserPayload(gaps, jobRoleName, careerGoals, marketDemandTrends));
    if (raw.isPresent()) {
      String jsonPayload = LlmJsonExtractor.firstJsonObject(raw.get()).orElse(raw.get());
      try {
        JsonNode node = objectMapper.readTree(jsonPayload);
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
      } catch (Exception e) {
        usedLlm = false;
      }
    }

    if (!usedLlm) {
      ai.put("model", "heuristic-readiness-v1");
      ai.put("source", "heuristic");
    }

    ensureCoachingFields(ai, gaps, jobRoleName, careerGoals, marketDemandTrends);

    return ai;
  }

  /**
   * Fills coaching copy from gap data when the LLM is off, failed, or returned empty fields.
   */
  private static void ensureCoachingFields(
      Map<String, Object> ai,
      SkillGapService.SkillGapSummary gaps,
      String jobRoleName,
      List<String> careerGoals,
      Map<String, Integer> marketDemandTrends
  ) {
    List<String> hot = gaps.gaps().stream()
        .filter(g -> "RED".equals(g.color()) || "ORANGE".equals(g.color()))
        .limit(5)
        .map(SkillGapService.SkillGapItem::skillName)
        .collect(Collectors.toList());

    if (ai.get("priorityFocus") == null && !hot.isEmpty()) {
      ai.put("priorityFocus", hot);
    }

    if (ai.get("nextStep") == null) {
      String role = jobRoleName == null || jobRoleName.isBlank() ? "your role requirements" : jobRoleName;
      if (!hot.isEmpty()) {
        ai.put("nextStep", "Prioritize learning or practice for "
            + hot.get(0)
            + " first, then address remaining red/orange gaps to align with "
            + role
            + ".");
      } else {
        ai.put("nextStep", "Keep your profile updated and revisit skills as "
            + role
            + " expectations change.");
      }
    }

    if (ai.get("marketNote") == null) {
      ai.put("marketNote",
          "Market trend proxy (gap distribution): " + summarizeTrends(marketDemandTrends)
              + ". External labor-market feed is not connected.");
    }

    Object fn = ai.get("forecastNote");
    if (fn == null || (fn instanceof String s && s.isBlank())) {
      ai.put("forecastNote", String.format(
          "Skill gap snapshot: %d green, %d yellow, %d orange, %d red — address higher-severity gaps first for the fastest path to role readiness.",
          gaps.greenCount(), gaps.yellowCount(), gaps.orangeCount(), gaps.redCount()));
    }

    if (ai.get("learningPath") == null) {
      List<String> path = new ArrayList<>();
      if (!hot.isEmpty()) path.add("Prioritize " + hot.get(0) + " to close the largest current gap.");
      if (hot.size() > 1) path.add("Then develop " + hot.get(1) + " with a role-aligned training program.");
      if (!careerGoals.isEmpty()) path.add("Align practice milestones with career direction: " + careerGoals.get(0));
      if (path.isEmpty()) path.add("Maintain your strengths and refresh skill declarations monthly.");
      ai.put("learningPath", path);
    }
  }

  private static void putIfText(Map<String, Object> ai, String key, JsonNode n) {
    if (n.isTextual()) {
      String t = n.asText().trim();
      if (!t.isBlank()) {
        ai.put(key, t);
      }
    }
  }

  private static String buildUserPayload(
      SkillGapService.SkillGapSummary gaps,
      String jobRoleName,
      List<String> careerGoals,
      Map<String, Integer> marketDemandTrends
  ) {
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
    if (careerGoals != null && !careerGoals.isEmpty()) {
      sb.append("Career goals / direction hints: ").append(String.join("; ", careerGoals)).append('\n');
    }
    if (marketDemandTrends != null && !marketDemandTrends.isEmpty()) {
      sb.append("Market demand trend proxy (gap color counts): ").append(summarizeTrends(marketDemandTrends)).append('\n');
    }
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

  private static String summarizeTrends(Map<String, Integer> trends) {
    if (trends == null || trends.isEmpty()) return "no trend data";
    return "GREEN=" + trends.getOrDefault("GREEN", 0)
        + ", YELLOW=" + trends.getOrDefault("YELLOW", 0)
        + ", ORANGE=" + trends.getOrDefault("ORANGE", 0)
        + ", RED=" + trends.getOrDefault("RED", 0);
  }
}

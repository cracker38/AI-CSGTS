package com.aicsgts.service;

import com.aicsgts.domain.*;
import com.aicsgts.repo.SystemConfigRepository;
import com.aicsgts.repo.TrainingProgramRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrainingRecommendationService {

  public record RecommendedTraining(
      Long programId,
      String title,
      String description,
      String provider,
      String deliveryFormat,
      Long skillId,
      String gapColor,
      boolean priority
  ) {
  }

  public record RecommendationSummary(
      List<RecommendedTraining> items,
      List<String> careerSuggestions,
      Map<String, Integer> gapTrends
  ) {
  }

  private final TrainingProgramRepository trainingPrograms;
  private final SystemConfigRepository config;

  public TrainingRecommendationService(
      TrainingProgramRepository trainingPrograms,
      SystemConfigRepository config
  ) {
    this.trainingPrograms = trainingPrograms;
    this.config = config;
  }

  public RecommendationSummary recommendForEmployee(
      SkillGapService.SkillGapSummary gapSummary
  ) {
    int gapAlertRank = config.findAll().stream().findFirst().map(SystemConfig::getGapAlertRank).orElse(2);

    List<RecommendedTraining> out = new ArrayList<>();
    Map<String, Integer> trends = new HashMap<>();
    for (var item : gapSummary.gaps()) {
      trends.merge(item.color(), 1, Integer::sum);

      boolean needsTraining = !"GREEN".equals(item.color());
      if (!needsTraining) continue;

      // Priority when the gap is large enough.
      boolean priority = item.gapRank() >= gapAlertRank;

      List<TrainingProgram> programs = trainingPrograms.findBySkillId(item.skillId());
      // Pick trainings that target at least the required level (best effort in MVP).
      List<TrainingProgram> candidates = programs.stream()
          .filter(p -> p.getTargetLevel().rank() >= item.requiredLevel().rank())
          .toList();

      if (candidates.isEmpty()) {
        candidates = programs;
      }

      for (TrainingProgram p : candidates.stream().limit(2).toList()) {
        String fmt = p.getDeliveryFormat() == null ? null : p.getDeliveryFormat().name();
        out.add(new RecommendedTraining(
            p.getId(),
            p.getTitle(),
            p.getDescription(),
            p.getProvider(),
            fmt,
            item.skillId(),
            item.color(),
            priority
        ));
      }
    }

    List<String> career = buildCareerSuggestions(gapSummary);
    return new RecommendationSummary(out, career, trends);
  }

  private List<String> buildCareerSuggestions(SkillGapService.SkillGapSummary gapSummary) {
    int red = gapSummary.redCount();
    int yellow = gapSummary.yellowCount();

    if (red > yellow) {
      return List.of("Focus on core competency upskilling first for faster role readiness.",
          "Schedule targeted sessions for the highest-risk skills highlighted in red.");
    }
    return List.of("Build momentum with intermediate improvements to close smaller gaps.",
        "Maintain a steady practice plan and reassess skill levels after training.");
  }
}


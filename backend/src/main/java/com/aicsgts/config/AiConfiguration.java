package com.aicsgts.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AiProperties.class)
public class AiConfiguration {
  private static final Logger log = LoggerFactory.getLogger(AiConfiguration.class);
  private final AiProperties props;

  public AiConfiguration(AiProperties props) {
    this.props = props;
  }

  @PostConstruct
  void logAiConfigurationSafety() {
    String key = props.getOpenaiApiKey() == null ? "" : props.getOpenaiApiKey().trim();
    if (props.isForceDisabled()) {
      log.info("AI calls are force-disabled via app.ai.force-disabled=true");
      return;
    }
    if (key.isBlank()) {
      log.warn("AI provider key is not configured. Set APP_AI_OPENAI_API_KEY (or OPENAI_API_KEY) to enable LLM features.");
      return;
    }
    if (looksLikeDefaultOrPlaceholder(key)) {
      log.error("AI provider key appears to be placeholder/default text. Replace with a real secret from environment variables.");
      return;
    }
    log.info("AI provider key detected via configuration. Base URL: {}, model: {}", props.getOpenaiBaseUrl(), props.getModel());
  }

  private static boolean looksLikeDefaultOrPlaceholder(String key) {
    String lower = key.toLowerCase();
    return lower.contains("change_me")
        || lower.contains("placeholder")
        || lower.contains("sk-proj-")
        || lower.contains("sk-live-")
        || lower.contains("sk-test-");
  }
}

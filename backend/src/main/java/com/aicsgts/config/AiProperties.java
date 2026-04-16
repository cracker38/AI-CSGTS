package com.aicsgts.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {

  /**
   * Base URL for OpenAI-compatible APIs, e.g. https://api.openai.com/v1 or http://localhost:11434/v1 (Ollama).
   */
  private String openaiBaseUrl = "https://api.openai.com/v1";

  /**
   * API key. When non-blank and {@link #forceDisabled} is false, LLM calls are attempted (with fallback on errors).
   */
  private String openaiApiKey = "";

  private String model = "gpt-4o-mini";

  private int timeoutSeconds = 60;

  /**
   * When true, sends OpenAI {@code response_format: json_object} for stricter JSON (disable for some local/Ollama setups).
   */
  private boolean jsonResponseFormat = true;

  /** When true, never calls the LLM even if a key is set. */
  private boolean forceDisabled = false;

  public boolean isLlmActive() {
    return !forceDisabled && openaiApiKey != null && !openaiApiKey.isBlank();
  }

  public String getOpenaiBaseUrl() {
    return openaiBaseUrl;
  }

  public void setOpenaiBaseUrl(String openaiBaseUrl) {
    this.openaiBaseUrl = openaiBaseUrl;
  }

  public String getOpenaiApiKey() {
    return openaiApiKey;
  }

  public void setOpenaiApiKey(String openaiApiKey) {
    this.openaiApiKey = openaiApiKey;
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }

  public int getTimeoutSeconds() {
    return timeoutSeconds;
  }

  public void setTimeoutSeconds(int timeoutSeconds) {
    this.timeoutSeconds = timeoutSeconds;
  }

  public boolean isJsonResponseFormat() {
    return jsonResponseFormat;
  }

  public void setJsonResponseFormat(boolean jsonResponseFormat) {
    this.jsonResponseFormat = jsonResponseFormat;
  }

  public boolean isForceDisabled() {
    return forceDisabled;
  }

  public void setForceDisabled(boolean forceDisabled) {
    this.forceDisabled = forceDisabled;
  }
}

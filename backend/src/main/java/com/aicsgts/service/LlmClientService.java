package com.aicsgts.service;

import com.aicsgts.config.AiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * OpenAI-compatible chat client (works with many gateways and local /v1 servers).
 */
@Service
public class LlmClientService {

  private static final Logger log = LoggerFactory.getLogger(LlmClientService.class);

  private final AiProperties props;
  private final ObjectMapper objectMapper;

  public LlmClientService(AiProperties props, ObjectMapper objectMapper) {
    this.props = props;
    this.objectMapper = objectMapper;
  }

  public Optional<String> chat(String systemPrompt, String userPrompt) {
    if (!props.isLlmActive()) {
      return Optional.empty();
    }
    String base = props.getOpenaiBaseUrl().trim().replaceAll("/+$", "");
    SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
    int ms = Math.max(5_000, props.getTimeoutSeconds() * 1000);
    rf.setConnectTimeout(Duration.ofMillis(ms));
    rf.setReadTimeout(Duration.ofMillis(ms));

    RestClient client = RestClient.builder()
        .baseUrl(base)
        .requestFactory(rf)
        .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + props.getOpenaiApiKey().trim())
        .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .build();

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("model", props.getModel());
    body.put("temperature", 0.25);
    body.put("max_tokens", 1200);
    body.put("messages", List.of(
        Map.of("role", "system", "content", systemPrompt),
        Map.of("role", "user", "content", userPrompt)
    ));
    if (props.isJsonResponseFormat()) {
      body.put("response_format", Map.of("type", "json_object"));
    }

    try {
      String raw = client.post()
          .uri("/chat/completions")
          .body(body)
          .retrieve()
          .body(String.class);
      if (raw == null || raw.isBlank()) {
        log.warn("LLM returned empty response body");
        return Optional.empty();
      }
      JsonNode root = objectMapper.readTree(raw);
      JsonNode err = root.path("error").path("message");
      if (err.isTextual() && !err.asText().isBlank()) {
        log.warn("LLM API error: {}", err.asText());
        return Optional.empty();
      }
      JsonNode content = root.path("choices").path(0).path("message").path("content");
      if (!content.isTextual()) {
        log.warn("LLM response missing message content");
        return Optional.empty();
      }
      return Optional.of(stripCodeFences(content.asText().trim()));
    } catch (RestClientException e) {
      log.warn("LLM request failed: {}", e.getMessage());
      return Optional.empty();
    } catch (java.io.IOException e) {
      log.warn("LLM response parse failed: {}", e.getMessage());
      return Optional.empty();
    }
  }

  private static String stripCodeFences(String s) {
    String t = s.trim();
    if (t.startsWith("```")) {
      int nl = t.indexOf('\n');
      if (nl > 0) {
        t = t.substring(nl + 1);
      }
      int end = t.lastIndexOf("```");
      if (end >= 0) {
        t = t.substring(0, end);
      }
    }
    return t.trim();
  }
}

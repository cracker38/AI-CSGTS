package com.aicsgts.service;

import com.aicsgts.config.AiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Minimal OpenAI-compatible chat client (also works with Ollama /v1 when exposed).
 */
@Service
public class LlmClientService {

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
    RestClient client = RestClient.builder()
        .baseUrl(base)
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

    try {
      String raw = client.post()
          .uri("/chat/completions")
          .body(body)
          .retrieve()
          .body(String.class);
      if (raw == null || raw.isBlank()) {
        return Optional.empty();
      }
      JsonNode root = objectMapper.readTree(raw);
      JsonNode content = root.path("choices").path(0).path("message").path("content");
      if (!content.isTextual()) {
        return Optional.empty();
      }
      return Optional.of(stripCodeFences(content.asText().trim()));
    } catch (RestClientException | java.io.IOException e) {
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

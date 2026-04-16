package com.aicsgts.service;

import com.aicsgts.domain.SystemConfig;
import com.aicsgts.repo.SystemConfigRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class IntegrationHealthService {

  private final SystemConfigRepository configRepository;
  private final ObjectMapper objectMapper;

  public IntegrationHealthService(SystemConfigRepository configRepository, ObjectMapper objectMapper) {
    this.configRepository = configRepository;
    this.objectMapper = objectMapper;
  }

  public Map<String, Object> check() {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("checkedAt", Instant.now());

    Optional<SystemConfig> cfgOpt = configRepository.findAll().stream().findFirst();
    if (cfgOpt.isEmpty() || cfgOpt.get().getIntegrationsJson() == null || cfgOpt.get().getIntegrationsJson().isBlank()) {
      out.put("status", "NO_CONFIG");
      out.put("jira", notConfigured("jiraBaseUrl"));
      out.put("asana", notConfigured("asanaWorkspaceId"));
      out.put("ldap", notConfigured("ldapServerUrl"));
      return out;
    }

    Map<String, Object> cfg = parseConfig(cfgOpt.get().getIntegrationsJson());
    out.put("status", "OK");
    out.put("jira", checkJira(cfg));
    out.put("asana", checkAsana(cfg));
    out.put("ldap", checkLdap(cfg));
    return out;
  }

  private Map<String, Object> checkJira(Map<String, Object> cfg) {
    String baseUrl = asText(cfg.get("jiraBaseUrl"));
    if (baseUrl.isBlank()) return notConfigured("jiraBaseUrl");
    return httpReachability(baseUrl);
  }

  private Map<String, Object> checkAsana(Map<String, Object> cfg) {
    String workspaceId = asText(cfg.get("asanaWorkspaceId"));
    if (workspaceId.isBlank()) return notConfigured("asanaWorkspaceId");
    String url = "https://app.asana.com/api/1.0/workspaces/" + workspaceId;
    return httpReachability(url);
  }

  private Map<String, Object> checkLdap(Map<String, Object> cfg) {
    String ldapServerUrl = asText(cfg.get("ldapServerUrl"));
    if (ldapServerUrl.isBlank()) return notConfigured("ldapServerUrl");
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("configured", true);
    result.put("target", ldapServerUrl);
    try {
      URI uri = URI.create(ldapServerUrl);
      String host = uri.getHost();
      int port = uri.getPort() > 0 ? uri.getPort() : ("ldaps".equalsIgnoreCase(uri.getScheme()) ? 636 : 389);
      if (host == null || host.isBlank()) {
        return down(result, "Invalid LDAP host");
      }
      try (Socket socket = new Socket()) {
        socket.connect(new InetSocketAddress(host, port), 3000);
      }
      result.put("reachable", true);
      result.put("status", "UP");
      return result;
    } catch (Exception e) {
      return down(result, e.getMessage());
    }
  }

  private Map<String, Object> httpReachability(String rawUrl) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("configured", true);
    result.put("target", rawUrl);
    try {
      URI uri = URI.create(rawUrl);
      HttpClient client = HttpClient.newBuilder()
          .connectTimeout(Duration.ofSeconds(3))
          .followRedirects(HttpClient.Redirect.NORMAL)
          .build();
      HttpRequest req = HttpRequest.newBuilder(uri)
          .GET()
          .timeout(Duration.ofSeconds(5))
          .build();
      HttpResponse<Void> resp = client.send(req, HttpResponse.BodyHandlers.discarding());
      int code = resp.statusCode();
      result.put("httpStatus", code);
      result.put("reachable", true);
      result.put("status", "UP");
      return result;
    } catch (Exception e) {
      return down(result, e.getMessage());
    }
  }

  private static Map<String, Object> down(Map<String, Object> result, String error) {
    result.put("reachable", false);
    result.put("status", "DOWN");
    result.put("error", error == null ? "Unknown connectivity error" : error);
    return result;
  }

  private static Map<String, Object> notConfigured(String key) {
    return Map.of(
        "configured", false,
        "status", "NOT_CONFIGURED",
        "missing", key
    );
  }

  private Map<String, Object> parseConfig(String json) {
    try {
      return objectMapper.readValue(json, new TypeReference<>() {});
    } catch (Exception e) {
      return Map.of();
    }
  }

  private static String asText(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }
}

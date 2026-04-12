package com.aicsgts.service;

import com.aicsgts.config.AiProperties;
import com.aicsgts.domain.Skill;
import com.aicsgts.repo.SkillRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Job description analysis: local n-grams + taxonomy match, optional OpenAI-compatible LLM layer.
 */
@Service
public class JobDescriptionNlpService {

  private static final Set<String> STOP = Set.of(
      "the", "a", "an", "and", "or", "to", "of", "in", "for", "on", "with", "as", "by", "at", "from", "is", "are", "be", "this", "that",
      "will", "you", "we", "our", "your", "all", "any", "can", "must", "should", "have", "has", "been", "including", "such", "into", "their",
      "they", "them", "who", "what", "which", "than", "then", "also", "not", "but", "if", "so", "it", "its", "via", "per", "using", "use"
  );

  private static final Pattern TOKEN = Pattern.compile("\\W+");
  private static final Pattern SENTENCE_END = Pattern.compile("[.!?]+\\s+");
  private static final Pattern BULLET_LINE = Pattern.compile("^\\s*([•\\-\\*•]|\\d+\\.\\s).+");

  private static final String JD_SYSTEM = """
      You extract structure from job descriptions. Reply with ONLY valid JSON, no markdown.
      Schema: {"summary":"2-4 sentences","responsibilities":["bullet strings"],"requirements":["bullet strings"],"skillPhrases":["concrete tools, frameworks, certifications, methods"]}
      Use empty arrays if unknown. skillPhrases: short noun phrases only, no sentences.""";

  private final SkillRepository skillRepository;
  private final LlmClientService llmClient;
  private final ObjectMapper objectMapper;
  private final AiProperties aiProperties;

  public JobDescriptionNlpService(
      SkillRepository skills,
      LlmClientService llmClient,
      ObjectMapper objectMapper,
      AiProperties aiProperties
  ) {
    this.skillRepository = skills;
    this.llmClient = llmClient;
    this.objectMapper = objectMapper;
    this.aiProperties = aiProperties;
  }

  public Map<String, Object> analyze(String rawText) {
    Map<String, Object> local = analyzeLocal(rawText);
    if (!aiProperties.isLlmActive()) {
      return local;
    }
    String clipped = rawText == null ? "" : rawText;
    if (clipped.length() > 14_000) {
      clipped = clipped.substring(0, 14_000);
    }
    Optional<String> raw = llmClient.chat(JD_SYSTEM, "Job description:\n" + clipped);
    if (raw.isEmpty()) {
      return local;
    }
    try {
      JsonNode n = objectMapper.readTree(raw.get());
      Map<String, Object> merged = new LinkedHashMap<>(local);
      Map<String, Object> llmBlock = parseLlmJson(n);
      merged.put("llm", llmBlock);
      merged.put("model", "hybrid-local+" + aiProperties.getModel());

      List<String> phrases = new ArrayList<>();
      Object sp = llmBlock.get("skillPhrases");
      if (sp instanceof List<?> list) {
        for (Object o : list) {
          if (o != null && !o.toString().isBlank()) {
            phrases.add(o.toString().trim());
          }
        }
      }
      @SuppressWarnings("unchecked")
      List<Map<String, Object>> tax = (List<Map<String, Object>>) merged.get("taxonomyMatches");
      List<Map<String, Object>> extra = matchPhrasesToTaxonomy(phrases, skillRepository.findAll());
      Set<Long> have = tax.stream().map(m -> ((Number) m.get("skillId")).longValue()).collect(Collectors.toSet());
      for (Map<String, Object> row : extra) {
        long id = ((Number) row.get("skillId")).longValue();
        if (!have.contains(id)) {
          tax.add(row);
          have.add(id);
        }
      }
      merged.put("taxonomyMatches", tax);
      return merged;
    } catch (Exception e) {
      return local;
    }
  }

  private Map<String, Object> parseLlmJson(JsonNode n) {
    Map<String, Object> m = new LinkedHashMap<>();
    putText(m, "summary", n.path("summary"));
    m.put("responsibilities", toStringList(n.path("responsibilities")));
    m.put("requirements", toStringList(n.path("requirements")));
    m.put("skillPhrases", toStringList(n.path("skillPhrases")));
    return m;
  }

  private static List<String> toStringList(JsonNode arr) {
    if (!arr.isArray()) {
      return List.of();
    }
    List<String> out = new ArrayList<>();
    for (JsonNode x : arr) {
      if (x.isTextual()) {
        String t = x.asText().trim();
        if (!t.isBlank()) {
          out.add(t);
        }
      }
    }
    return out;
  }

  private static void putText(Map<String, Object> m, String key, JsonNode n) {
    if (n.isTextual()) {
      String t = n.asText().trim();
      if (!t.isBlank()) {
        m.put(key, t);
      }
    }
  }

  private List<Map<String, Object>> matchPhrasesToTaxonomy(List<String> phrases, List<Skill> catalog) {
    List<Map<String, Object>> out = new ArrayList<>();
    Set<Long> seen = new HashSet<>();
    for (String phrase : phrases) {
      String pl = phrase.toLowerCase(Locale.ROOT);
      for (Skill s : catalog) {
        if (seen.contains(s.getId())) {
          continue;
        }
        String name = s.getName().toLowerCase(Locale.ROOT);
        if (pl.contains(name) || name.contains(pl) || name.length() >= 3 && pl.contains(name.replace(" ", ""))) {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("skillId", s.getId());
          row.put("skillName", s.getName());
          row.put("match", "llm-phrase");
          row.put("score", 0.75);
          out.add(row);
          seen.add(s.getId());
        }
      }
    }
    return out;
  }

  private Map<String, Object> analyzeLocal(String rawText) {
    String text = rawText == null ? "" : rawText;
    String textLower = text.toLowerCase(Locale.ROOT);
    List<String> tokens = tokenize(textLower);

    Map<String, Integer> freq = new HashMap<>();
    for (String t : tokens) {
      freq.merge(t, 1, Integer::sum);
    }

    List<Map<String, Object>> topKeywords = freq.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .limit(28)
        .map(e -> {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("term", e.getKey());
          row.put("count", e.getValue());
          return row;
        })
        .toList();

    Map<String, Integer> bigramFreq = new HashMap<>();
    for (int i = 0; i < tokens.size() - 1; i++) {
      String a = tokens.get(i);
      String b = tokens.get(i + 1);
      if (a.length() < 2 || b.length() < 2) {
        continue;
      }
      bigramFreq.merge(a + " " + b, 1, Integer::sum);
    }
    List<Map<String, Object>> topBigrams = bigramFreq.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .limit(18)
        .map(e -> {
          Map<String, Object> row = new LinkedHashMap<>();
          row.put("phrase", e.getKey());
          row.put("count", e.getValue());
          return row;
        })
        .toList();

    String extractiveSummary = extractiveSummary(text);
    int bulletLines = 0;
    int lineCount = 0;
    for (String line : text.split("\\R")) {
      lineCount++;
      if (BULLET_LINE.matcher(line).matches()) {
        bulletLines++;
      }
    }

    List<Skill> catalog = skillRepository.findAll();
    List<Map<String, Object>> taxonomyMatches = matchTaxonomy(textLower, catalog);

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("model", "keyword-ngram-v2");
    out.put("tokenCount", tokens.size());
    out.put("uniqueTerms", freq.size());
    out.put("topKeywords", topKeywords);
    out.put("topBigrams", topBigrams);
    out.put("extractiveSummary", extractiveSummary);
    out.put("structure", Map.of(
        "lineCount", lineCount,
        "bulletLineCount", bulletLines
    ));
    out.put("taxonomyMatches", taxonomyMatches);
    return out;
  }

  private static List<String> tokenize(String textLower) {
    String[] parts = TOKEN.split(textLower);
    List<String> tokens = new ArrayList<>();
    for (String p : parts) {
      if (p.length() < 3) {
        continue;
      }
      if (STOP.contains(p)) {
        continue;
      }
      tokens.add(p);
    }
    return tokens;
  }

  private static String extractiveSummary(String text) {
    String t = text.replaceAll("\\s+", " ").trim();
    if (t.isEmpty()) {
      return "";
    }
    String[] chunks = SENTENCE_END.split(t);
    StringBuilder sb = new StringBuilder();
    int n = 0;
    for (String c : chunks) {
      String s = c.trim();
      if (s.length() < 20) {
        continue;
      }
      if (sb.length() > 0) {
        sb.append(' ');
      }
      sb.append(s);
      if (s.endsWith(".") || s.endsWith("!") || s.endsWith("?")) {
        /* already punctuated */
      } else {
        sb.append('.');
      }
      n++;
      if (n >= 3 || sb.length() > 480) {
        break;
      }
    }
    if (sb.isEmpty()) {
      return t.length() > 400 ? t.substring(0, 397) + "…" : t;
    }
    return sb.toString();
  }

  private static List<Map<String, Object>> matchTaxonomy(String textLower, List<Skill> catalog) {
    Map<Long, Map<String, Object>> byId = new LinkedHashMap<>();
    for (Skill s : catalog) {
      String n = s.getName().toLowerCase(Locale.ROOT);
      if (n.length() < 2) {
        continue;
      }
      double score = 0;
      String match = null;
      if (textLower.contains(n)) {
        score = 1.0;
        match = "substring";
      } else {
        String[] parts = n.split("[^a-z0-9+#]+");
        int hit = 0;
        int total = 0;
        for (String p : parts) {
          if (p.length() < 2) {
            continue;
          }
          total++;
          if (textLower.contains(p)) {
            hit++;
          }
        }
        if (total > 0) {
          double r = (double) hit / total;
          if (r >= 0.34) {
            score = r * 0.88;
            match = "token-overlap";
          }
        }
      }
      if (score <= 0) {
        continue;
      }
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("skillId", s.getId());
      row.put("skillName", s.getName());
      row.put("match", match);
      row.put("score", Math.round(score * 100.0) / 100.0);
      byId.merge(s.getId(), row, (a, b) -> {
        double sa = ((Number) a.get("score")).doubleValue();
        double sb = ((Number) b.get("score")).doubleValue();
        return sa >= sb ? a : b;
      });
    }
    return byId.values().stream()
        .sorted((a, b) -> Double.compare(
            ((Number) b.get("score")).doubleValue(),
            ((Number) a.get("score")).doubleValue()))
        .collect(Collectors.toList());
  }
}

package com.aicsgts.service;

import java.util.Optional;

/**
 * Pulls a JSON object out of LLM output when the model adds prose or fences around it.
 */
final class LlmJsonExtractor {

  private LlmJsonExtractor() {
  }

  static Optional<String> firstJsonObject(String text) {
    if (text == null || text.isBlank()) {
      return Optional.empty();
    }
    String t = text.trim();
    int start = t.indexOf('{');
    if (start < 0) {
      return Optional.empty();
    }
    int depth = 0;
    boolean inString = false;
    boolean escape = false;
    for (int i = start; i < t.length(); i++) {
      char c = t.charAt(i);
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (c == '\\') {
          escape = true;
          continue;
        }
        if (c == '"') {
          inString = false;
        }
        continue;
      }
      if (c == '"') {
        inString = true;
        continue;
      }
      if (c == '{') {
        depth++;
      } else if (c == '}') {
        depth--;
        if (depth == 0) {
          return Optional.of(t.substring(start, i + 1));
        }
      }
    }
    return Optional.empty();
  }
}

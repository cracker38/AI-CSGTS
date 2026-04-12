package com.aicsgts.service;

import com.aicsgts.domain.AuditLog;
import com.aicsgts.repo.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Exports a tamper-evident bundle (CSV + manifest with SHA-256) for compliance demos — not a WORM archive.
 */
@Service
public class CompliancePackService {

  private static final int MAX_ROWS = 10_000;

  private final AuditLogRepository audit;
  private final ObjectMapper json = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);

  public CompliancePackService(AuditLogRepository audit) {
    this.audit = audit;
  }

  @Transactional(readOnly = true)
  public byte[] buildPack() throws Exception {
    var page = audit.findAllByOrderByCreatedAtDesc(PageRequest.of(0, MAX_ROWS));
    List<AuditLog> rows = page.getContent();
    StringBuilder csv = new StringBuilder("id,createdAt,action,actorEmail,details\n");
    for (AuditLog a : rows) {
      csv.append(a.getId()).append(',');
      csv.append(a.getCreatedAt() != null ? a.getCreatedAt().toString() : "").append(',');
      csv.append(escape(a.getAction())).append(',');
      csv.append(escape(a.getActor() != null ? a.getActor().getEmail() : "")).append(',');
      csv.append(escape(a.getDetails())).append('\n');
    }
    byte[] csvBytes = csv.toString().getBytes(StandardCharsets.UTF_8);
    String sha = sha256(csvBytes);

    Map<String, Object> manifest = new LinkedHashMap<>();
    manifest.put("generatedAt", Instant.now().toString());
    manifest.put("rowCount", rows.size());
    manifest.put("auditCsvSha256", sha);
    manifest.put("files", List.of(
        Map.of("name", "audit_events.csv", "sha256", sha),
        Map.of("name", "manifest.json", "note", "hash of audit_events.csv only; sign this manifest in production")
    ));
    manifest.put("legalNote", "Demo bundle — store offline with organizational policy; not blockchain-immutable.");

    byte[] manifestBytes = json.writeValueAsBytes(manifest);

    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    try (ZipOutputStream z = new ZipOutputStream(bos)) {
      zipEntry(z, "audit_events.csv", csvBytes);
      zipEntry(z, "manifest.json", manifestBytes);
    }
    return bos.toByteArray();
  }

  private static void zipEntry(ZipOutputStream z, String name, byte[] data) throws Exception {
    ZipEntry e = new ZipEntry(name);
    e.setTime(System.currentTimeMillis());
    z.putNextEntry(e);
    z.write(data);
    z.closeEntry();
  }

  private static String escape(String s) {
    if (s == null) return "";
    String x = s.replace("\"", "\"\"");
    if (x.contains(",") || x.contains("\"") || x.contains("\n") || x.contains("\r")) {
      return "\"" + x + "\"";
    }
    return x;
  }

  private static String sha256(byte[] data) throws Exception {
    MessageDigest md = MessageDigest.getInstance("SHA-256");
    return HexFormat.of().formatHex(md.digest(data));
  }
}

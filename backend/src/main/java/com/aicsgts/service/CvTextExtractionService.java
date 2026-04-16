package com.aicsgts.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class CvTextExtractionService {

  public String extract(byte[] bytes, String contentType, String fileName) {
    if (bytes == null || bytes.length == 0) return "";
    String ct = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT).trim();
    String fn = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT).trim();
    try {
      if ("application/pdf".equals(ct) || fn.endsWith(".pdf")) {
        return sanitize(extractPdf(bytes));
      }
      if ("application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(ct) || fn.endsWith(".docx")) {
        return sanitize(extractDocx(bytes));
      }
      if ("text/plain".equals(ct) || fn.endsWith(".txt")) {
        return sanitize(new String(bytes, StandardCharsets.UTF_8));
      }
    } catch (Exception ignored) {
    }
    return "";
  }

  private static String extractPdf(byte[] bytes) throws Exception {
    try (PDDocument doc = Loader.loadPDF(bytes)) {
      return new PDFTextStripper().getText(doc);
    }
  }

  private static String extractDocx(byte[] bytes) throws Exception {
    try (ByteArrayInputStream in = new ByteArrayInputStream(bytes); XWPFDocument doc = new XWPFDocument(in)) {
      return doc.getParagraphs().stream().map(XWPFParagraph::getText).collect(Collectors.joining("\n"));
    }
  }

  private static String sanitize(String text) {
    if (text == null) return "";
    String normalized = text.replace("\u0000", " ").replaceAll("\\s+", " ").trim();
    if (normalized.length() > 12000) return normalized.substring(0, 12000);
    return normalized;
  }
}

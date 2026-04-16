package com.aicsgts.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class CertificationStorageService {

  private final Path root;

  public CertificationStorageService(@Value("${app.upload.dir:${java.io.tmpdir}/ai-csgts-uploads}") String rootPath) {
    this.root = Path.of(rootPath).toAbsolutePath().normalize();
  }

  public String storeFile(long employeeId, String originalFilename, byte[] bytes) throws IOException {
    return storeFileInFolder("certifications", employeeId, originalFilename, bytes);
  }

  public String storeCvFile(long employeeId, String originalFilename, byte[] bytes) throws IOException {
    return storeFileInFolder("cvs", employeeId, originalFilename, bytes);
  }

  private String storeFileInFolder(String folder, long employeeId, String originalFilename, byte[] bytes) throws IOException {
    String safe = originalFilename == null ? "upload" : originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
    if (safe.length() > 180) safe = safe.substring(0, 180);
    String rel = folder + "/" + employeeId + "/" + UUID.randomUUID() + "_" + safe;
    Path target = root.resolve(rel).normalize();
    if (!target.startsWith(root)) {
      throw new IOException("Invalid path");
    }
    Files.createDirectories(target.getParent());
    Files.write(target, bytes);
    return rel;
  }

  public byte[] readFile(String storagePath) throws IOException {
    Path p = root.resolve(storagePath).normalize();
    if (!p.startsWith(root)) {
      throw new IOException("Invalid path");
    }
    return Files.readAllBytes(p);
  }

  public void deleteFile(String storagePath) throws IOException {
    Path p = root.resolve(storagePath).normalize();
    if (!p.startsWith(root)) {
      throw new IOException("Invalid path");
    }
    Files.deleteIfExists(p);
  }
}

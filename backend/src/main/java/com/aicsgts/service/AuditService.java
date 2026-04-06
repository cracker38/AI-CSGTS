package com.aicsgts.service;

import com.aicsgts.domain.AuditLog;
import com.aicsgts.security.AuthPrincipal;
import com.aicsgts.repo.AuditLogRepository;
import com.aicsgts.repo.AppUserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuditService {

  private final AuditLogRepository audit;
  private final AppUserRepository users;

  public AuditService(AuditLogRepository audit, AppUserRepository users) {
    this.audit = audit;
    this.users = users;
  }

  public void log(String action, String details) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof AuthPrincipal principal)) return;

    AuditLog entry = new AuditLog();
    entry.setActor(users.findById(principal.getUserId()).orElse(null));
    entry.setAction(action);
    entry.setDetails(details);
    entry.setCreatedAt(Instant.now());
    audit.save(entry);
  }
}


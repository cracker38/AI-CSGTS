package com.aicsgts.service;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.LoginEvent;
import com.aicsgts.repo.LoginEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoginAuditService {

  private final LoginEventRepository loginEvents;

  public LoginAuditService(LoginEventRepository loginEvents) {
    this.loginEvents = loginEvents;
  }

  @Transactional
  public void recordAttempt(AppUser userOrNull, String emailAttempt, boolean success, HttpServletRequest req) {
    LoginEvent e = new LoginEvent();
    e.setUser(userOrNull);
    e.setEmailAttempt(emailAttempt == null ? null : emailAttempt.trim().toLowerCase());
    e.setSuccess(success);
    if (req != null) {
      e.setIpAddress(clientIp(req));
      String ua = req.getHeader("User-Agent");
      if (ua != null && ua.length() > 512) {
        ua = ua.substring(0, 512);
      }
      e.setUserAgent(ua);
    }
    loginEvents.save(e);
  }

  private static String clientIp(HttpServletRequest req) {
    String x = req.getHeader("X-Forwarded-For");
    if (x != null && !x.isBlank()) {
      int comma = x.indexOf(',');
      return comma > 0 ? x.substring(0, comma).trim() : x.trim();
    }
    String ip = req.getRemoteAddr();
    return ip != null && ip.length() > 64 ? ip.substring(0, 64) : ip;
  }
}

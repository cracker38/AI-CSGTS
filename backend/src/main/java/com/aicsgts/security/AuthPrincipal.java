package com.aicsgts.security;

import com.aicsgts.domain.Role;

public class AuthPrincipal {
  private final Long userId;
  private final String email;
  private final String name;
  private final Role role;

  public AuthPrincipal(Long userId, String email, String name, Role role) {
    this.userId = userId;
    this.email = email;
    this.name = name;
    this.role = role;
  }

  public Long getUserId() {
    return userId;
  }

  public String getEmail() {
    return email;
  }

  public String getName() {
    return name;
  }

  public Role getRole() {
    return role;
  }
}


package com.aicsgts.security;

import com.aicsgts.domain.AppUser;
import com.aicsgts.domain.Role;
import com.aicsgts.repo.AppUserRepository;
import com.aicsgts.repo.RolePermissionRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

public class JwtAuthFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

  private final JwtService jwtService;
  private final AppUserRepository users;
  private final RolePermissionRepository rolePermissions;

  public JwtAuthFilter(JwtService jwtService, AppUserRepository users, RolePermissionRepository rolePermissions) {
    this.jwtService = jwtService;
    this.users = users;
    this.rolePermissions = rolePermissions;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = header.substring("Bearer ".length());
    if (!jwtService.isValid(token)) {
      filterChain.doFilter(request, response);
      return;
    }

    try {
      Claims claims = jwtService.parse(token);
      String email = claims.get("email", String.class);
      String name = claims.get("name", String.class);
      String roleStr = claims.get("role", String.class);
      Long userId = Long.valueOf(claims.getSubject());
      Role role = Role.valueOf(roleStr);

      AppUser user = users.findByEmail(email).orElse(null);
      if (user == null || !user.isActive()) {
        filterChain.doFilter(request, response);
        return;
      }

      AuthPrincipal principal = new AuthPrincipal(userId, email, name, role);
      List<String> codes = rolePermissions.findPermissionCodesByRole(role);
      var authorities = codes.stream()
          .distinct()
          .map(SimpleGrantedAuthority::new)
          .collect(Collectors.toList());
      authorities.add(new SimpleGrantedAuthority(role.name())); // keep role-based checks working

      var auth = new UsernamePasswordAuthenticationToken(
          principal,
          null,
          authorities
      );
      auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
      SecurityContextHolder.getContext().setAuthentication(auth);
    } catch (Exception e) {
      // DB / mapping errors used to bubble up as opaque 500s on every authenticated call.
      log.error("JWT authentication failed for request {} {}", request.getMethod(), request.getRequestURI(), e);
      SecurityContextHolder.clearContext();
    }
    filterChain.doFilter(request, response);
  }
}


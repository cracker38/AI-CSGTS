package com.aicsgts.security;

import com.aicsgts.domain.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {

  private final SecretKey key;
  private final String issuer;
  private final long expirationMs;
  private final long rememberMeExpirationMs;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.issuer}") String issuer,
      @Value("${app.jwt.expiration-ms}") long expirationMs,
      @Value("${app.jwt.refresh-token-expiration-ms}") long rememberMeExpirationMs
  ) {
    // HS256 expects at least 256-bit keys. Use a long random secret.
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.issuer = issuer;
    this.expirationMs = expirationMs;
    this.rememberMeExpirationMs = Math.max(rememberMeExpirationMs, expirationMs);
  }

  public String generateToken(Long userId, String email, String name, Role role) {
    return generateToken(userId, email, name, role, false);
  }

  public String generateToken(Long userId, String email, String name, Role role, boolean rememberMe) {
    Instant now = Instant.now();
    long ttl = rememberMe ? rememberMeExpirationMs : expirationMs;
    Instant exp = now.plusMillis(ttl);

    return Jwts.builder()
        .setIssuer(issuer)
        .setSubject(userId.toString())
        .setIssuedAt(Date.from(now))
        .setExpiration(Date.from(exp))
        .claim("email", email)
        .claim("name", name)
        .claim("role", role.name())
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }

  public boolean isValid(String token) {
    try {
      parse(token);
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  public Claims parse(String token) {
    return Jwts.parser()
        .setSigningKey(key)
        .build()
        .parseClaimsJws(token)
        .getBody();
  }
}


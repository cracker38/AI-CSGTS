import jwt from "jsonwebtoken";
import { config } from "@/config";

export type AccessTokenPayload = {
  sub: string; // user id
  tenantId: string;
  roleNames: Array<"EMPLOYEE" | "MANAGER" | "HR_ADMIN" | "SYSTEM_ADMIN">;
};

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtlSeconds,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
}


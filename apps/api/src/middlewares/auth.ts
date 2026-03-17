import type { NextFunction, Response } from "express";
import { verifyAccessToken } from "@/auth/tokens";
import { HttpError } from "@/http/errors";
import type { AuthedRequest } from "@/http/types";

export function authRequired(req: AuthedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return next(new HttpError(401, "UNAUTHENTICATED", "Missing bearer token"));
  }

  const token = authHeader.slice("bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, tenantId: payload.tenantId, roleNames: payload.roleNames };
    return next();
  } catch {
    return next(new HttpError(401, "UNAUTHENTICATED", "Invalid or expired token"));
  }
}


import type { NextFunction, Response } from "express";
import { HttpError } from "@/http/errors";
import type { AuthedRequest, RoleName } from "@/http/types";

export function requireAnyRole(roles: RoleName[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const userRoles = req.auth?.roleNames ?? [];
    const ok = roles.some((r) => userRoles.includes(r));
    if (!ok) return next(new HttpError(403, "FORBIDDEN", "Insufficient permissions"));
    return next();
  };
}


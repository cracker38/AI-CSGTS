import type { Request } from "express";

export type RoleName = "EMPLOYEE" | "MANAGER" | "HR_ADMIN" | "SYSTEM_ADMIN";

export type AuthContext = {
  userId: string;
  tenantId: string;
  roleNames: RoleName[];
};

export type AuthedRequest = Request & { auth?: AuthContext };


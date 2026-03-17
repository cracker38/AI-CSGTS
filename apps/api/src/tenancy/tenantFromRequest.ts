import type { Request } from "express";

export function getTenantSlug(req: Request) {
  return (req.header("x-tenant-slug") ?? "demo").trim().toLowerCase();
}


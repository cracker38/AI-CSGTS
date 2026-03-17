import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/prisma";
import { authRequired } from "@/middlewares/auth";
import { requireAnyRole } from "@/middlewares/rbac";
import { HttpError } from "@/http/errors";
import { writeAudit } from "@/audit/writeAudit";
import type { AuthedRequest } from "@/http/types";

export const adminRouter = Router();

adminRouter.get(
  "/admin/approvals",
  authRequired,
  requireAnyRole(["HR_ADMIN", "SYSTEM_ADMIN"]),
  async (req: AuthedRequest, res, next) => {
    try {
      const users = await prisma.user.findMany({
        where: { tenantId: req.auth!.tenantId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, fullName: true, createdAt: true },
      });
      res.json({ ok: true, users });
    } catch (err) {
      next(err);
    }
  },
);

const approveSchema = z.object({
  userId: z.string().uuid(),
  roleNames: z
    .array(z.enum(["EMPLOYEE", "MANAGER", "HR_ADMIN", "SYSTEM_ADMIN"]))
    .min(1)
    .default(["EMPLOYEE"]),
});

adminRouter.post(
  "/admin/approvals/approve",
  authRequired,
  requireAnyRole(["HR_ADMIN", "SYSTEM_ADMIN"]),
  async (req: AuthedRequest, res, next) => {
    try {
      const input = approveSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        include: { roles: { include: { role: true } } },
      });
      if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");
      if (user.tenantId !== req.auth!.tenantId) throw new HttpError(403, "FORBIDDEN", "Tenant mismatch");

      const before = { status: user.status, roleNames: user.roles.map((r) => r.role.name) };

      const roles = await prisma.role.findMany({
        where: { tenantId: req.auth!.tenantId, name: { in: input.roleNames } },
      });
      if (roles.length !== input.roleNames.length) {
        throw new HttpError(400, "INVALID_ROLE", "One or more roles do not exist");
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            status: "ACTIVE",
            approvedAt: new Date(),
            approvedBy: req.auth!.userId,
          },
        });

        await tx.userRole.deleteMany({ where: { userId: user.id } });
        await tx.userRole.createMany({
          data: roles.map((r) => ({ userId: user.id, roleId: r.id })),
        });
      });

      await writeAudit({
        tenantId: req.auth!.tenantId,
        actorUserId: req.auth!.userId,
        eventType: "USER_APPROVED",
        entityType: "User",
        entityId: user.id,
        before,
        after: { status: "ACTIVE", roleNames: input.roleNames },
        ip: req.ip,
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);


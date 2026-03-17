import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/prisma";
import { getTenantSlug } from "@/tenancy/tenantFromRequest";
import { HttpError } from "@/http/errors";
import { signAccessToken } from "@/auth/tokens";
import { writeAudit } from "@/audit/writeAudit";
import { authRequired } from "@/middlewares/auth";
import type { AuthedRequest } from "@/http/types";

export const authRouter = Router();

const registerSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
});

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const tenantSlug = getTenantSlug(req);
    const input = registerSchema.parse(req.body);

    const tenant =
      (await prisma.tenant.findUnique({ where: { slug: tenantSlug } })) ??
      (await prisma.tenant.create({
        data: { name: tenantSlug === "demo" ? "Demo Company" : tenantSlug, slug: tenantSlug },
      }));

    // Ensure baseline roles exist for the tenant.
    const existingRoles = await prisma.role.findMany({ where: { tenantId: tenant.id } });
    if (existingRoles.length === 0) {
      await prisma.role.createMany({
        data: [
          { tenantId: tenant.id, name: "EMPLOYEE", description: "Employee" },
          { tenantId: tenant.id, name: "MANAGER", description: "Manager" },
          { tenantId: tenant.id, name: "HR_ADMIN", description: "HR Admin" },
          { tenantId: tenant.id, name: "SYSTEM_ADMIN", description: "System Admin" },
        ],
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user
      .create({
        data: {
          tenantId: tenant.id,
          email: input.email.toLowerCase(),
          passwordHash,
          fullName: input.fullName,
          status: "PENDING",
          roles: {
            create: [
              {
                role: {
                  connect: {
                    tenantId_name: { tenantId: tenant.id, name: "EMPLOYEE" },
                  },
                },
              },
            ],
          },
        },
        include: { roles: { include: { role: true } } },
      })
      .catch((e) => {
        // Prisma unique constraint for (tenantId,email).
        if (String(e?.code) === "P2002") {
          throw new HttpError(409, "EMAIL_TAKEN", "Email already registered");
        }
        throw e;
      });

    await writeAudit({
      tenantId: tenant.id,
      actorUserId: null,
      eventType: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      after: { email: user.email, status: user.status },
      ip: req.ip,
    });

    res.status(201).json({
      ok: true,
      status: user.status,
      message: "Registration submitted. Await HR approval.",
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1),
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const tenantSlug = getTenantSlug(req);
    const input = loginSchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new HttpError(404, "TENANT_NOT_FOUND", "Tenant not found");

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: input.email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    if (user.status !== "ACTIVE") {
      throw new HttpError(403, "USER_NOT_ACTIVE", "User pending approval or suspended");
    }

    const roleNames = user.roles.map((ur) => ur.role.name);
    const accessToken = signAccessToken({ sub: user.id, tenantId: tenant.id, roleNames });

    await prisma.loginHistory.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        ip: req.ip,
        userAgent: req.header("user-agent"),
      },
    });

    await writeAudit({
      tenantId: tenant.id,
      actorUserId: user.id,
      eventType: "LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
      ip: req.ip,
    });

    res.json({
      ok: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        roleNames,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/auth/me", authRequired, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");
    if (user.tenantId !== req.auth!.tenantId) {
      throw new HttpError(403, "FORBIDDEN", "Cross-tenant access blocked");
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        roleNames: user.roles.map((ur) => ur.role.name),
      },
    });
  } catch (err) {
    next(err);
  }
});


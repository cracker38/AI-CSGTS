import type { Prisma } from "@prisma/client";
import { prisma } from "@/prisma";

export async function writeAudit(input: {
  tenantId: string;
  actorUserId?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ip?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      eventType: input.eventType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      beforeJson: input.before ?? undefined,
      afterJson: input.after ?? undefined,
      ip: input.ip ?? null,
    },
  });
}


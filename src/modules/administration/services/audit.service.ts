import { prisma } from "@/server/infrastructure/database";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import type { SafeAdminAuditLogDto } from "../types/admin.types";

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
}

export class AdminAuditService {
  private static readonly SENSITIVE_KEYS = new Set([
    "password",
    "token",
    "tokenhash",
    "initdata",
    "secretconfiguration",
    "solutionhash",
    "solutionconfig",
    "solution",
    "rawsolution",
    "authorization",
    "cookie",
    "secret",
    "apikey",
  ]);

  /**
   * Recursively sanitizes metadata to ensure zero cryptographic secrets enter audit records.
   */
  public static sanitizeMetadata(data: any): any {
    if (!data || typeof data !== "object") return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeMetadata(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (this.SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = "[REDACTED_SECRET]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Records an administrative action in the auditable log history.
   * Can accept an existing Prisma transaction client for atomic execution.
   */
  public static async recordAction(
    params: CreateAuditLogParams,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx || prisma;

    const safeMeta = params.metadata ? this.sanitizeMetadata(params.metadata) : Prisma.JsonNull;

    try {
      await db.adminAuditLog.create({
        data: {
          actorId: params.actorId || null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId || null,
          metadata: safeMeta,
        },
      });

      logger.info("Admin audit event recorded", {
        actorId: params.actorId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
      });
    } catch (err: any) {
      logger.error("Failed to record admin audit event", {
        error: err.message,
        action: params.action,
        resourceType: params.resourceType,
      });
      if (tx) {
        throw err;
      }
    }
  }

  /**
   * Retrieves paginated audit logs for authorized administrative inspection.
   */
  public static async getAuditLogs(params: {
    page?: number;
    limit?: number;
    actorId?: string;
    resourceType?: string;
    action?: string;
  }): Promise<{ logs: SafeAdminAuditLogDto[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuditLogWhereInput = {};
    if (params.actorId) where.actorId = params.actorId;
    if (params.resourceType) where.resourceType = params.resourceType;
    if (params.action) where.action = { contains: params.action, mode: "insensitive" };

    const [total, logs] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              telegramUsername: true,
              firstName: true,
              lastName: true,
              profile: { select: { displayName: true, codename: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formatted: SafeAdminAuditLogDto[] = logs.map((log) => {
      let actorDisplayName = "System";
      if (log.actor) {
        actorDisplayName =
          log.actor.profile?.displayName ||
          log.actor.profile?.codename ||
          [log.actor.firstName, log.actor.lastName].filter(Boolean).join(" ") ||
          log.actor.telegramUsername ||
          "Unknown Admin";
      }

      return {
        id: log.id,
        actorId: log.actorId,
        actorDisplayName,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        metadata: (log.metadata as Record<string, any>) || null,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return {
      logs: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

import { prisma } from "@/server/infrastructure/database";
import { AppError } from "@/lib/errors/app-error";
import { AdminAuditService } from "./audit.service";
import type { SystemSettingDto } from "../types/admin.types";

export class AdminSettingsService {
  /**
   * Retrieves all registered platform settings.
   */
  public static async listSettings(): Promise<SystemSettingDto[]> {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    return settings.map((s) => ({
      key: s.key,
      value: s.value,
      description: s.description,
      updatedAt: s.updatedAt.toISOString(),
      updatedById: s.updatedById,
    }));
  }

  /**
   * Retrieves a single system setting by key.
   */
  public static async getSetting(key: string): Promise<SystemSettingDto | null> {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) return null;

    return {
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt.toISOString(),
      updatedById: setting.updatedById,
    };
  }

  /**
   * Updates or creates a system setting.
   */
  public static async updateSetting(
    actorId: string,
    key: string,
    value: any,
    description?: string
  ): Promise<SystemSettingDto> {
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value,
        ...(description ? { description } : {}),
        updatedById: actorId,
      },
      create: {
        key,
        value,
        description: description || null,
        updatedById: actorId,
      },
    });

    await AdminAuditService.recordAction({
      actorId,
      action: "SYSTEM_SETTING_UPDATE",
      resourceType: "SystemSetting",
      resourceId: key,
      metadata: { key, updatedValue: value },
    });

    return {
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt.toISOString(),
      updatedById: setting.updatedById,
    };
  }
}

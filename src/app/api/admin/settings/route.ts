import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminSettingsService } from "@/modules/administration/services/admin-settings.service";
import { UpdateSettingSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 */
export async function GET(): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("SYSTEM_SETTINGS_MANAGE");
    const settings = await AdminSettingsService.listSettings();

    return NextResponse.json({
      ok: true,
      data: { settings },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list system settings", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/settings
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("SYSTEM_SETTINGS_MANAGE");

    const body = await request.json().catch(() => ({}));
    const key = body.key;
    if (!key || typeof key !== "string") {
      throw new AppError("Setting key is required", 400, "KEY_REQUIRED");
    }

    const validated = UpdateSettingSchema.parse(body);

    const setting = await AdminSettingsService.updateSetting(
      admin.userId,
      key,
      validated.value,
      validated.description
    );

    return NextResponse.json({
      ok: true,
      data: { setting },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update system setting", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

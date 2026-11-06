import { NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminRolesService } from "@/modules/administration/services/admin-roles.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/permissions
 */
export async function GET(): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("ROLE_VIEW");
    const permissions = await AdminRolesService.listPermissions();

    return NextResponse.json({
      ok: true,
      data: { permissions },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list permissions", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

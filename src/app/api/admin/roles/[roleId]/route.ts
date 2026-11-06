import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminRolesService } from "@/modules/administration/services/admin-roles.service";
import { UpdateRoleSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/roles/[roleId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ roleId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("ROLE_UPDATE");
    const { roleId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateRoleSchema.parse(body);

    const role = await AdminRolesService.updateRole(admin.userId, roleId, validated);

    return NextResponse.json({
      ok: true,
      data: { role },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update role", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

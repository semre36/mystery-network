import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminRolesService } from "@/modules/administration/services/admin-roles.service";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const TargetUserSchema = z.object({
  userId: z.string().uuid("Invalid target user ID"),
});

/**
 * POST /api/admin/roles/[roleId]/revoke
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roleId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("ROLE_ASSIGN");
    const { roleId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = TargetUserSchema.parse(body);

    await AdminRolesService.revokeRoleFromUser(admin.userId, validated.userId, roleId);

    return NextResponse.json({
      ok: true,
      message: "Role revoked from user successfully",
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to revoke role from user", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

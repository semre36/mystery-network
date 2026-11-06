import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminUsersService } from "@/modules/administration/services/admin-users.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[userId]
 * Retrieves detailed administrative dossier for an operative.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("USER_VIEW");
    const { userId } = await context.params;

    const user = await AdminUsersService.getUserDetail(userId);

    return NextResponse.json({
      ok: true,
      data: { user },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve user detail", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

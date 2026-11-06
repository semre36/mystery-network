import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminUsersService } from "@/modules/administration/services/admin-users.service";
import { SuspendUserSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/[userId]/suspend
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("USER_SUSPEND");
    const { userId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = SuspendUserSchema.parse(body);

    await AdminUsersService.suspendUser(admin.userId, userId, validated.reason);

    return NextResponse.json({
      ok: true,
      message: "Operative account suspended successfully",
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to suspend user", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

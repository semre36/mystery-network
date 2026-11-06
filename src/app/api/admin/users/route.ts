import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminUsersService } from "@/modules/administration/services/admin-users.service";
import { UserStatus } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Lists registered players with search, status filtering, and pagination.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("USER_VIEW");

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const statusParam = searchParams.get("status") as UserStatus | null;
    const status =
      statusParam && Object.values(UserStatus).includes(statusParam) ? statusParam : undefined;

    const result = await AdminUsersService.listUsers({ page, limit, search, status });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list users", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

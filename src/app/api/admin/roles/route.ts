import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminRolesService } from "@/modules/administration/services/admin-roles.service";
import { CreateRoleSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/roles
 */
export async function GET(): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("ROLE_VIEW");
    const roles = await AdminRolesService.listRoles();

    return NextResponse.json({
      ok: true,
      data: { roles },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list roles", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/roles
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("ROLE_CREATE");
    const body = await request.json().catch(() => ({}));
    const validated = CreateRoleSchema.parse(body);

    const role = await AdminRolesService.createRole(admin.userId, validated);

    return NextResponse.json({
      ok: true,
      data: { role },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create role", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

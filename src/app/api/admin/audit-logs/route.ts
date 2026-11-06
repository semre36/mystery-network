import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminAuditService } from "@/modules/administration/services/audit.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit-logs
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("AUDIT_LOG_VIEW");

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const actorId = searchParams.get("actorId") || undefined;
    const resourceType = searchParams.get("resourceType") || undefined;
    const action = searchParams.get("action") || undefined;

    const result = await AdminAuditService.getAuditLogs({
      page,
      limit,
      actorId,
      resourceType,
      action,
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to retrieve audit logs", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

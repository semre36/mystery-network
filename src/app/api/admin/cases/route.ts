import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { CreateCaseSchema } from "@/modules/administration/validation/admin.schema";
import { ContentStatus, CaseDifficulty } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cases
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await AdminGuard.requirePermission("CASE_VIEW");

    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status") as ContentStatus | null;
    const difficultyParam = searchParams.get("difficulty") as CaseDifficulty | null;
    const campaignId = searchParams.get("campaignId") || undefined;

    const cases = await AdminContentService.listCases({
      status:
        statusParam && Object.values(ContentStatus).includes(statusParam) ? statusParam : undefined,
      difficulty:
        difficultyParam && Object.values(CaseDifficulty).includes(difficultyParam)
          ? difficultyParam
          : undefined,
      campaignId,
    });

    return NextResponse.json({
      ok: true,
      data: { cases },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to list cases", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cases
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("CASE_CREATE");
    const body = await request.json().catch(() => ({}));
    const validated = CreateCaseSchema.parse(body);

    const newCase = await AdminContentService.createCase(admin.userId, validated);

    return NextResponse.json({
      ok: true,
      data: { case: newCase },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create case", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

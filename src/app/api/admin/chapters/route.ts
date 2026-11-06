import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { CreateChapterSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/chapters
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("CHAPTER_MANAGE");
    const body = await request.json().catch(() => ({}));
    const validated = CreateChapterSchema.parse(body);

    const chapter = await AdminContentService.createChapter(admin.userId, validated);

    return NextResponse.json({
      ok: true,
      data: { chapter },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create chapter", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { UpdateChapterSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/chapters/[chapterId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ chapterId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("CHAPTER_MANAGE");
    const { chapterId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateChapterSchema.parse(body);

    const chapter = await AdminContentService.updateChapter(admin.userId, chapterId, validated);

    return NextResponse.json({
      ok: true,
      data: { chapter },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update chapter", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

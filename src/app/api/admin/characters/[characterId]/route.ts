import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { UpdateCharacterSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/characters/[characterId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ characterId: string }> }
): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("CHARACTER_MANAGE");
    const { characterId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validated = UpdateCharacterSchema.parse(body);

    const character = await AdminContentService.updateCharacter(
      admin.userId,
      characterId,
      validated
    );

    return NextResponse.json({
      ok: true,
      data: { character },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to update character", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

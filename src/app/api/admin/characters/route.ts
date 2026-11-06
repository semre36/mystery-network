import { NextRequest, NextResponse } from "next/server";
import { AdminGuard } from "@/modules/administration/guards/admin.guard";
import { AdminContentService } from "@/modules/administration/services/admin-content.service";
import { CreateCharacterSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/characters
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const admin = await AdminGuard.requirePermission("CHARACTER_MANAGE");
    const body = await request.json().catch(() => ({}));
    const validated = CreateCharacterSchema.parse(body);

    const character = await AdminContentService.createCharacter(admin.userId, validated);

    return NextResponse.json({
      ok: true,
      data: { character },
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to create character", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

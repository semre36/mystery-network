import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/investigations/[investigationId]/evidence/[evidenceId]/share/[shareId]
 * Revokes an active evidence share.
 * Strictly permitted only for the operative who originally transmitted the evidence.
 */
export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ investigationId: string; evidenceId: string; shareId: string }>;
  }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, shareId } = await context.params;

    await EvidenceService.revokeEvidenceShare(user.id, investigationId, shareId);

    return NextResponse.json({
      ok: true,
      message: "Evidence share revoked successfully",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    logger.error("Failed to revoke evidence share", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Internal server error revoking evidence share",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

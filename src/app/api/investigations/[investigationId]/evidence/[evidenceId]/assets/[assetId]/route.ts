import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { EvidenceService } from "@/modules/evidence/services/evidence.service";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/investigations/[investigationId]/evidence/[evidenceId]/assets/[assetId]
 * Authenticated streaming endpoint for classified evidence assets.
 * Enforces participant authorization, chapter unlocks, and evidence access before streaming.
 */
export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ investigationId: string; evidenceId: string; assetId: string }>;
  }
): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();
    const { investigationId, evidenceId, assetId } = await context.params;

    const { asset } = await EvidenceService.getEvidenceAsset(
      user.id,
      investigationId,
      evidenceId,
      assetId
    );

    // Resolve local storage path
    const localPath = path.resolve(process.cwd(), "storage", asset.storageKey);

    if (!fs.existsSync(localPath)) {
      return NextResponse.json(
        {
          error:
            "Asset binary file is not available on local storage; awaiting object storage sync",
          code: "ASSET_FILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(localPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Disposition": `inline; filename="${asset.fileName}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
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

    logger.error("Failed to stream evidence asset", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Internal server error retrieving evidence asset",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

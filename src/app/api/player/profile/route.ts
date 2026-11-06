import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/modules/authentication/guards/auth.guard";
import { PlayerService } from "@/modules/players/services/player.service";
import { updateProfileSchema } from "@/modules/players/validation/player.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request): Promise<NextResponse> {
  try {
    const user = await requireAuthenticatedUser();

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request: Malformed JSON payload", code: "MALFORMED_JSON" },
        { status: 400 }
      );
    }

    const parseResult = updateProfileSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed for profile update",
          code: "VALIDATION_ERROR",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const updatedDossier = await PlayerService.updateProfile(user.id, parseResult.data);

    return NextResponse.json({
      ok: true,
      message: "Investigator dossier updated successfully",
      dossier: updatedDossier,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.statusCode }
      );
    }

    logger.error("Unexpected failure updating investigator profile", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Unable to update investigator dossier",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

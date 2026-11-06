import { NextRequest, NextResponse } from "next/server";
import { AdminBootstrapService } from "@/modules/administration/services/bootstrap.service";
import { BootstrapAdminSchema } from "@/modules/administration/validation/admin.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/bootstrap
 * Protected one-time operational procedure to establish initial SUPER_ADMIN.
 * Strictly requires ADMIN_BOOTSTRAP_SECRET to be configured and provided.
 * Permanently disabled once a SUPER_ADMIN exists.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!configuredSecret || configuredSecret.trim().length === 0) {
      throw new AppError(
        "API bootstrap is disabled. Use the CLI bootstrap command 'npm run admin:bootstrap' or configure ADMIN_BOOTSTRAP_SECRET.",
        403,
        "API_BOOTSTRAP_DISABLED"
      );
    }

    const body = await request.json().catch(() => ({}));
    const validated = BootstrapAdminSchema.parse(body);

    // Header or body secret check with timing-safe comparison
    const incomingSecret =
      request.headers.get("x-bootstrap-secret") || validated.bootstrapSecret || "";

    const secretBuffer = Buffer.from(incomingSecret);
    const expectedBuffer = Buffer.from(configuredSecret);

    if (
      secretBuffer.length === 0 ||
      secretBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(secretBuffer, expectedBuffer)
    ) {
      throw new AppError("Invalid operational bootstrap secret", 403, "INVALID_BOOTSTRAP_SECRET");
    }

    const result = await AdminBootstrapService.bootstrapInitialSuperAdmin({
      targetIdentifier: validated.targetIdentifier,
      bootstrapSecret: configuredSecret,
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode });
    }

    logger.error("Failed to bootstrap administrator", { error: err.message });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

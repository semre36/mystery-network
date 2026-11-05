import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { TelegramAuthService } from "@/modules/authentication/services/telegram-auth.service";
import { PlayerProvisioningService } from "@/modules/authentication/services/player-provisioning.service";
import { SessionService } from "@/modules/authentication/services/session.service";
import { getSessionCookieOptions } from "@/modules/authentication/utils/cookie.util";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const telegramAuthSchema = z.object({
  initData: z
    .string()
    .min(1, "initData cannot be empty")
    .max(8192, "initData payload exceeds maximum allowed size"),
});

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Parse and Validate Request Payload
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request: Malformed JSON payload", code: "MALFORMED_JSON" },
      { status: 400 }
    );
  }

  const parseResult = telegramAuthSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const { initData } = parseResult.data;

  try {
    // 2. Cryptographically Verify initData HMAC-SHA256 signature and freshness
    const validatedAuth = TelegramAuthService.verifyInitData(initData);

    // 3. Resolve or Provision Player Identity in a Transaction
    const playerUser = await PlayerProvisioningService.findOrCreatePlayer(validatedAuth);

    // 4. Capture Client Security Metadata
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    // 5. Create Server-Side Session with 256-bit Token
    const { rawToken, user } = await SessionService.createSession(playerUser.id, {
      userAgent,
      ipAddress,
    });

    // 6. Set Secure HTTP-Only Cookie
    const cookieStore = await cookies();
    const cookieOptions = getSessionCookieOptions(rawToken);

    cookieStore.set(cookieOptions.name, cookieOptions.value, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return NextResponse.json(
      {
        ok: true,
        user,
      },
      { status: 200 }
    );
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

    logger.error("Unexpected error during Telegram authentication", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "An unexpected error occurred during authentication",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

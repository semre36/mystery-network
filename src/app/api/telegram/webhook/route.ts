import { NextResponse } from "next/server";
import type { Update } from "grammy/types";
import { getBot } from "@/modules/telegram/bot/bot";
import { verifyTelegramWebhookSecret } from "@/modules/telegram/utils/webhook-security.util";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // 1. Verify Secret Token
  const verification = verifyTelegramWebhookSecret(secretHeader, configuredSecret);
  if (!verification.isValid) {
    logger.warn("Rejected unauthorized Telegram webhook request", {
      reason: verification.reason,
    });
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing secret token" },
      { status: 401 }
    );
  }

  // 2. Parse Incoming Update Payload
  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch (err) {
    logger.warn("Malformed JSON payload received on Telegram webhook", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Bad Request: Malformed JSON payload" }, { status: 400 });
  }

  // 3. Process Update through grammY Bot
  try {
    const bot = getBot();
    await bot.handleUpdate(update);

    logger.debug("Successfully processed Telegram update", {
      updateId: update.update_id,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error("Error occurred while processing Telegram update", {
      updateId: update?.update_id,
      error: error instanceof Error ? error.message : String(error),
    });

    // Telegram requires 200 OK to acknowledge receipt; return 200 to prevent retries for unrecoverable errors
    return NextResponse.json({ ok: true, handledWithError: true }, { status: 200 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method Not Allowed. Telegram webhooks require POST." },
    { status: 405 }
  );
}

import type { Context } from "grammy";
import { TELEGRAM_MESSAGES } from "../../utils/message.util";
import { parseDeepLink } from "../../utils/deep-link.util";
import { buildMainMenuKeyboard } from "../../keyboards/main-menu.keyboard";

export async function handleStartCommand(ctx: Context, miniAppUrl?: string): Promise<void> {
  const payload = ctx.match as string | undefined;
  const parsed = parseDeepLink(payload);

  let message = TELEGRAM_MESSAGES.START_WELCOME;

  if (parsed?.type === "invite") {
    message += TELEGRAM_MESSAGES.START_INVITATION_DETECTED(parsed.value);
  } else if (parsed?.type === "case") {
    message += TELEGRAM_MESSAGES.START_CASE_DETECTED(parsed.value);
  }

  const keyboard = buildMainMenuKeyboard(miniAppUrl);

  if (!miniAppUrl && !keyboard) {
    message += `\n\n${TELEGRAM_MESSAGES.PLAY_UNAVAILABLE}`;
  }

  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
}

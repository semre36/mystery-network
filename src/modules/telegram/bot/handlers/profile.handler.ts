import type { Context } from "grammy";
import { TELEGRAM_MESSAGES } from "../../utils/message.util";
import { buildMainMenuKeyboard } from "../../keyboards/main-menu.keyboard";

export async function handleProfileCommand(ctx: Context, miniAppUrl?: string): Promise<void> {
  const keyboard = buildMainMenuKeyboard(miniAppUrl);

  await ctx.reply(TELEGRAM_MESSAGES.PROFILE_INFO, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
}

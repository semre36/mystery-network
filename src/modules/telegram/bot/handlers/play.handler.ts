import type { Context } from "grammy";
import { TELEGRAM_MESSAGES } from "../../utils/message.util";
import { buildPlayKeyboard } from "../../keyboards/main-menu.keyboard";

export async function handlePlayCommand(ctx: Context, miniAppUrl?: string): Promise<void> {
  const keyboard = buildPlayKeyboard(miniAppUrl);

  if (!keyboard) {
    await ctx.reply(TELEGRAM_MESSAGES.PLAY_UNAVAILABLE, {
      parse_mode: "Markdown",
    });
    return;
  }

  await ctx.reply("Ready to begin your investigation? Launch the network console below:", {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
}

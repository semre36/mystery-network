import type { Context } from "grammy";
import { TELEGRAM_MESSAGES } from "../../utils/message.util";

export async function handleAboutCommand(ctx: Context): Promise<void> {
  await ctx.reply(TELEGRAM_MESSAGES.ABOUT, {
    parse_mode: "Markdown",
  });
}

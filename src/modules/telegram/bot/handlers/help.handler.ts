import type { Context } from "grammy";
import { TELEGRAM_MESSAGES } from "../../utils/message.util";

export async function handleHelpCommand(ctx: Context): Promise<void> {
  await ctx.reply(TELEGRAM_MESSAGES.HELP, {
    parse_mode: "Markdown",
  });
}

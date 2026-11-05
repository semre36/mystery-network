import type { Bot } from "grammy";
import { handleStartCommand } from "./handlers/start.handler";
import { handleHelpCommand } from "./handlers/help.handler";
import { handleAboutCommand } from "./handlers/about.handler";
import { handlePlayCommand } from "./handlers/play.handler";
import { handleProfileCommand } from "./handlers/profile.handler";

/**
 * Official Telegram Bot Command Menu definitions.
 * Registered via Bot API setMyCommands.
 */
export const BOT_COMMAND_DEFINITIONS = [
  { command: "start", description: "Enter MYSTERY NETWORK." },
  { command: "play", description: "Open the investigation platform." },
  { command: "help", description: "Get help." },
  { command: "about", description: "About MYSTERY NETWORK." },
  { command: "profile", description: "Investigator profile." },
];

/**
 * Registers command listeners on the grammY bot instance.
 */
export function registerBotCommands(bot: Bot, miniAppUrl?: string): void {
  bot.command("start", (ctx) => handleStartCommand(ctx, miniAppUrl));
  bot.command("help", (ctx) => handleHelpCommand(ctx));
  bot.command("about", (ctx) => handleAboutCommand(ctx));
  bot.command("play", (ctx) => handlePlayCommand(ctx, miniAppUrl));
  bot.command("profile", (ctx) => handleProfileCommand(ctx, miniAppUrl));
}

import { Bot } from "grammy";
import { logger } from "@/lib/logger";
import { registerBotCommands } from "./commands";

/**
 * Creates and configures a grammY Bot instance with error boundaries and registered handlers.
 */
export function createBot(token: string, miniAppUrl?: string): Bot {
  if (!token) {
    throw new Error("Cannot instantiate Telegram Bot: bot token is required.");
  }

  const bot = new Bot(token);

  // Global error boundary for grammY
  bot.catch((err) => {
    logger.error("Unhandled error in Telegram Bot update handler", {
      updateId: err.ctx?.update?.update_id,
      errorName: err.name,
      errorMessage: err.message,
    });
  });

  // Attach command routing
  registerBotCommands(bot, miniAppUrl);

  return bot;
}

/**
 * Global singleton pattern for serverless / Next.js development environments.
 */
const globalForBot = globalThis as unknown as {
  telegramBot: Bot | undefined;
};

export function getBot(token?: string, miniAppUrl?: string): Bot {
  const resolvedToken = token ?? process.env.TELEGRAM_BOT_TOKEN;
  const resolvedMiniAppUrl = miniAppUrl ?? process.env.NEXT_PUBLIC_TELEGRAM_MINI_APP_URL;

  if (!resolvedToken) {
    throw new Error("TELEGRAM_BOT_TOKEN environment variable is not configured.");
  }

  if (!globalForBot.telegramBot) {
    globalForBot.telegramBot = createBot(resolvedToken, resolvedMiniAppUrl);
  }

  return globalForBot.telegramBot;
}

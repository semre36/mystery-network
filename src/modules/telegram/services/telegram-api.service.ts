import type { Bot } from "grammy";
import type { WebhookInfo } from "grammy/types";
import { logger } from "@/lib/logger";
import { BOT_COMMAND_DEFINITIONS } from "../bot/commands";

export class TelegramApiService {
  /**
   * Registers bot commands menu via setMyCommands.
   */
  public static async registerCommandsMenu(bot: Bot): Promise<boolean> {
    try {
      await bot.api.setMyCommands(BOT_COMMAND_DEFINITIONS);
      logger.info("Successfully registered Telegram Bot command menu", {
        commandCount: BOT_COMMAND_DEFINITIONS.length,
      });
      return true;
    } catch (error) {
      logger.error("Failed to register Telegram Bot command menu", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Registers webhook with Telegram Bot API with secret token.
   */
  public static async setWebhook(
    bot: Bot,
    webhookUrl: string,
    secretToken: string
  ): Promise<boolean> {
    if (!webhookUrl.startsWith("https://")) {
      throw new Error(
        "Invalid webhook URL: Telegram requires a publicly accessible HTTPS endpoint."
      );
    }

    if (!secretToken || secretToken.length < 1 || secretToken.length > 256) {
      throw new Error("Invalid secretToken: Must be between 1 and 256 characters.");
    }

    try {
      await bot.api.setWebhook(webhookUrl, {
        secret_token: secretToken,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
      });

      logger.info("Successfully registered Telegram Bot webhook", {
        webhookUrl,
        secretConfigured: true,
      });
      return true;
    } catch (error) {
      logger.error("Failed to register Telegram Bot webhook", {
        webhookUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Retrieves current webhook status from Telegram Bot API.
   */
  public static async getWebhookInfo(bot: Bot): Promise<WebhookInfo> {
    try {
      const info = await bot.api.getWebhookInfo();
      logger.info("Retrieved Telegram Bot webhook info", {
        url: info.url,
        hasCustomCertificate: info.has_custom_certificate,
        pendingUpdateCount: info.pending_update_count,
        lastErrorDate: info.last_error_date,
        lastErrorMessage: info.last_error_message,
      });
      return info;
    } catch (error) {
      logger.error("Failed to retrieve Telegram Bot webhook info", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Removes webhook registration.
   */
  public static async deleteWebhook(bot: Bot): Promise<boolean> {
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: false });
      logger.info("Successfully removed Telegram Bot webhook");
      return true;
    } catch (error) {
      logger.error("Failed to delete Telegram Bot webhook", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

try {
  process.loadEnvFile?.();
} catch {}

import { createBot } from "../src/modules/telegram/bot/bot";
import { TelegramApiService } from "../src/modules/telegram/services/telegram-api.service";

async function main() {
  const action = process.argv[2];

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    console.error("❌ Error: TELEGRAM_BOT_TOKEN environment variable is missing.");
    console.error("Please configure TELEGRAM_BOT_TOKEN in your environment or .env file.");
    process.exit(1);
  }

  const bot = createBot(token);

  switch (action) {
    case "info": {
      console.log("🔍 Fetching current Telegram Webhook info...");
      const info = await TelegramApiService.getWebhookInfo(bot);
      console.log("Current Webhook Status:", JSON.stringify(info, null, 2));
      break;
    }

    case "set-commands": {
      console.log("📝 Registering Telegram Bot command menu...");
      await TelegramApiService.registerCommandsMenu(bot);
      console.log("✅ Command menu registered successfully on @mysterynetworkbot.");
      break;
    }

    case "set-webhook": {
      if (!webhookUrl) {
        console.error("❌ Error: TELEGRAM_WEBHOOK_URL is required to register webhook.");
        process.exit(1);
      }
      if (!webhookSecret) {
        console.error("❌ Error: TELEGRAM_WEBHOOK_SECRET is required to secure webhook.");
        process.exit(1);
      }
      console.log(`📡 Registering Webhook at URL: ${webhookUrl}`);
      await TelegramApiService.setWebhook(bot, webhookUrl, webhookSecret);
      console.log("✅ Webhook registered successfully with Telegram Bot API.");
      break;
    }

    case "delete-webhook": {
      console.log("🗑️ Deleting Webhook from Telegram Bot API...");
      await TelegramApiService.deleteWebhook(bot);
      console.log("✅ Webhook deleted successfully.");
      break;
    }

    default:
      console.log("MYSTERY NETWORK — Telegram Bot CLI Management Tool");
      console.log("Usage: tsx scripts/telegram-setup.ts <command>");
      console.log("\nAvailable commands:");
      console.log("  info            Inspect active webhook status");
      console.log("  set-commands    Register official bot command menu (start, play, help, etc.)");
      console.log("  set-webhook     Register webhook URL with secret token");
      console.log("  delete-webhook  Remove active webhook registration");
      break;
  }
}

main().catch((err) => {
  console.error("❌ Telegram setup operation failed:", err.message);
  process.exit(1);
});

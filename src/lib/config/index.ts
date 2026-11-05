import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional().default("3000"),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default("MYSTERY NETWORK"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional().default("mysterynetworkbot"),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
  NEXT_PUBLIC_TELEGRAM_MINI_APP_URL: z.string().url().optional(),
});

function parseEnvironment() {
  const result = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL,
    NEXT_PUBLIC_TELEGRAM_MINI_APP_URL: process.env.NEXT_PUBLIC_TELEGRAM_MINI_APP_URL,
  });

  if (!result.success) {
    console.error("Invalid application configuration:", result.error.format());
    throw new Error("Invalid application configuration");
  }

  return result.data;
}

export const appConfig = parseEnvironment();

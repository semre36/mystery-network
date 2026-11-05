import { validate, parse } from "@tma.js/init-data-node";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { INIT_DATA_MAX_AGE_SECONDS, MAX_CLOCK_SKEW_SECONDS } from "../constants/auth.constants";
import type { ValidatedTelegramAuth } from "../types/auth.types";

export class TelegramAuthService {
  /**
   * Cryptographically verifies Telegram WebApp initData against the bot token.
   * Enforces HMAC-SHA256 signature verification, maximum age (5 mins), and clock-skew tolerance.
   */
  public static verifyInitData(rawInitData: string, botToken?: string): ValidatedTelegramAuth {
    const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      logger.error("Authentication failed: TELEGRAM_BOT_TOKEN is not configured on server");
      throw new AppError("Authentication service misconfigured", 500, "AUTH_CONFIG_ERROR");
    }

    if (!rawInitData || typeof rawInitData !== "string" || !rawInitData.trim()) {
      throw new AppError("Missing Telegram initialization data", 400, "MISSING_INIT_DATA");
    }

    // 1. Cryptographic HMAC-SHA256 and Max Age Verification via @tma.js/init-data-node
    try {
      validate(rawInitData, token, {
        expiresIn: INIT_DATA_MAX_AGE_SECONDS,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn("Telegram initData signature verification failed", {
        reason: errorMsg,
      });

      if (errorMsg.includes("expired") || errorMsg.includes("Expired")) {
        throw new AppError(
          "Telegram session data has expired. Please reopen the Mini App.",
          401,
          "EXPIRED_INIT_DATA"
        );
      }

      throw new AppError("Invalid Telegram authentication signature", 401, "INVALID_SIGNATURE");
    }

    // 2. Parse Validated Payload
    let parsed: any;
    try {
      parsed = parse(rawInitData);
    } catch {
      throw new AppError("Malformed Telegram initialization data", 400, "MALFORMED_INIT_DATA");
    }

    // 3. Enforce Future Clock-Skew Tolerance
    const authDate: Date | undefined = parsed?.authDate ?? parsed?.auth_date;
    if (!authDate || !(authDate instanceof Date) || isNaN(authDate.getTime())) {
      throw new AppError(
        "Invalid or missing auth_date in Telegram payload",
        400,
        "INVALID_AUTH_DATE"
      );
    }

    const now = Date.now();
    const authDateMs = authDate.getTime();
    const futureSkewSeconds = (authDateMs - now) / 1000;

    if (futureSkewSeconds > MAX_CLOCK_SKEW_SECONDS) {
      logger.warn("Telegram initData rejected due to future auth_date", {
        futureSkewSeconds,
      });
      throw new AppError(
        "Invalid authentication timestamp: auth_date is in the future",
        401,
        "FUTURE_AUTH_DATE"
      );
    }

    // 4. Validate Required User Object and Attributes
    const rawUser = parsed?.user;
    if (!rawUser || typeof rawUser !== "object") {
      throw new AppError("Missing user identity in Telegram payload", 400, "MISSING_USER_PAYLOAD");
    }

    const id = rawUser.id;
    const firstName = rawUser.firstName ?? rawUser.first_name;
    const lastName = rawUser.lastName ?? rawUser.last_name;
    const username = rawUser.username;
    const languageCode = rawUser.languageCode ?? rawUser.language_code;
    const isPremium = rawUser.isPremium ?? rawUser.is_premium;

    if (!id || typeof id !== "number" || id <= 0 || !Number.isSafeInteger(id)) {
      throw new AppError("Invalid Telegram user identifier", 400, "INVALID_TELEGRAM_USER_ID");
    }

    if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
      throw new AppError("Invalid or missing user first name", 400, "INVALID_USER_NAME");
    }

    const queryId = parsed.queryId ?? parsed.query_id;

    return {
      user: {
        id,
        first_name: firstName.trim(),
        last_name: lastName && typeof lastName === "string" ? lastName.trim() : undefined,
        username: username && typeof username === "string" ? username.trim() : undefined,
        language_code:
          languageCode && typeof languageCode === "string" ? languageCode.trim() : undefined,
        is_premium: typeof isPremium === "boolean" ? isPremium : undefined,
      },
      authDate,
      queryId: typeof queryId === "string" ? queryId : undefined,
      raw: rawInitData,
    };
  }
}

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../constants/auth.constants";

export interface CookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "none" | "strict";
  path: string;
  maxAge: number;
}

/**
 * Returns hardened cookie attributes tailored for Telegram Mini App environments.
 */
export function getSessionCookieOptions(token: string, isRevocation = false): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";

  return {
    name: SESSION_COOKIE_NAME,
    value: isRevocation ? "" : token,
    httpOnly: true,
    secure: isProd,
    // Telegram Mini Apps embedded in iframe/webview require SameSite=None + Secure in production
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: isRevocation ? 0 : SESSION_MAX_AGE_SECONDS,
  };
}

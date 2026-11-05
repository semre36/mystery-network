import { InlineKeyboard } from "grammy";

/**
 * Constructs the primary inline keyboard offering the Mini App launcher.
 * If miniAppUrl is not defined or not HTTPS, returns null.
 */
export function buildMainMenuKeyboard(miniAppUrl?: string): InlineKeyboard | undefined {
  if (!miniAppUrl || !miniAppUrl.startsWith("https://")) {
    return undefined;
  }

  return new InlineKeyboard().webApp("🕵️ Open Investigation Network", miniAppUrl);
}

export function buildPlayKeyboard(miniAppUrl?: string): InlineKeyboard | undefined {
  if (!miniAppUrl || !miniAppUrl.startsWith("https://")) {
    return undefined;
  }

  return new InlineKeyboard().webApp("🚀 Launch Mystery Network", miniAppUrl);
}

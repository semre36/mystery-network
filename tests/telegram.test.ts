import { describe, it, expect, vi } from "vitest";
import type { Context } from "grammy";
import { parseDeepLink } from "@/modules/telegram/utils/deep-link.util";
import { verifyTelegramWebhookSecret } from "@/modules/telegram/utils/webhook-security.util";
import {
  buildMainMenuKeyboard,
  buildPlayKeyboard,
} from "@/modules/telegram/keyboards/main-menu.keyboard";
import { handleStartCommand } from "@/modules/telegram/bot/handlers/start.handler";
import { handleHelpCommand } from "@/modules/telegram/bot/handlers/help.handler";
import { handleAboutCommand } from "@/modules/telegram/bot/handlers/about.handler";
import { handlePlayCommand } from "@/modules/telegram/bot/handlers/play.handler";
import { handleProfileCommand } from "@/modules/telegram/bot/handlers/profile.handler";
import { TELEGRAM_MESSAGES } from "@/modules/telegram/utils/message.util";
import { POST, GET } from "@/app/api/telegram/webhook/route";

describe("Telegram Bot Integration (Phase 03)", () => {
  describe("Deep-Link Parameter Parser", () => {
    it("should return null for undefined, null, or empty payloads", () => {
      expect(parseDeepLink(undefined)).toBeNull();
      expect(parseDeepLink("")).toBeNull();
      expect(parseDeepLink("   ")).toBeNull();
    });

    it("should correctly parse squad invite deep links", () => {
      const parsed = parseDeepLink("invite_SQ7F2A");
      expect(parsed).toEqual({
        type: "invite",
        value: "SQ7F2A",
        raw: "invite_SQ7F2A",
      });
    });

    it("should correctly parse case target deep links", () => {
      const parsed = parseDeepLink("case_CASE-001");
      expect(parsed).toEqual({
        type: "case",
        value: "CASE-001",
        raw: "case_CASE-001",
      });
    });

    it("should classify unrecognized safe tokens as unknown", () => {
      const parsed = parseDeepLink("campaign_spring");
      expect(parsed).toEqual({
        type: "unknown",
        value: "campaign_spring",
        raw: "campaign_spring",
      });
    });

    it("should reject malicious or invalid deep-link tokens with special characters", () => {
      expect(parseDeepLink("invite_bad$code")).toBeNull();
      expect(parseDeepLink("invite_code with spaces")).toBeNull();
      expect(parseDeepLink("invite_<script>")).toBeNull();
    });

    it("should reject tokens exceeding Telegram's 64 character constraint", () => {
      const longPayload = "a".repeat(65);
      expect(parseDeepLink(longPayload)).toBeNull();
    });
  });

  describe("Webhook Secret Verification", () => {
    const validSecret = "super-secret-random-token-xyz-123456789";

    it("should accept matching secret token in constant time", () => {
      const result = verifyTelegramWebhookSecret(validSecret, validSecret);
      expect(result.isValid).toBe(true);
    });

    it("should reject mismatching secret token", () => {
      const result = verifyTelegramWebhookSecret("wrong-secret-token-xyz", validSecret);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("should reject when incoming header is null or missing", () => {
      const result = verifyTelegramWebhookSecret(null, validSecret);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("Missing");
    });

    it("should reject when server-side secret is not configured", () => {
      const result = verifyTelegramWebhookSecret(validSecret, undefined);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("not configured");
    });
  });

  describe("Inline Keyboards", () => {
    it("should build webApp button when valid HTTPS miniAppUrl is supplied", () => {
      const keyboard = buildMainMenuKeyboard("https://mysterynetwork.com/app");
      expect(keyboard).toBeDefined();
      const btn = keyboard?.inline_keyboard[0][0];
      expect(btn?.text).toContain("Open Investigation Network");
      expect(btn && "web_app" in btn ? btn.web_app.url : "").toBe("https://mysterynetwork.com/app");
    });

    it("should return undefined when miniAppUrl is missing or not HTTPS", () => {
      expect(buildMainMenuKeyboard(undefined)).toBeUndefined();
      expect(buildMainMenuKeyboard("http://insecure.com")).toBeUndefined();
      expect(buildPlayKeyboard(undefined)).toBeUndefined();
    });
  });

  describe("Command Handlers", () => {
    function createMockContext(payload?: string) {
      const replyFn = vi.fn().mockResolvedValue(true);
      return {
        match: payload,
        reply: replyFn,
      } as unknown as Context;
    }

    it("/start should send welcome message without deep-link", async () => {
      const ctx = createMockContext();
      await handleStartCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledOnce();
      const [msg] = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(msg).toContain("Welcome to MYSTERY NETWORK.");
      expect(msg).toContain("Every player knows something.");
    });

    it("/start should detect and display squad invite code", async () => {
      const ctx = createMockContext("invite_SQUAD99");
      await handleStartCommand(ctx);

      const [msg] = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(msg).toContain("Squad Invitation Detected: [SQUAD99]");
    });

    it("/start should attach WebApp keyboard when miniAppUrl is configured", async () => {
      const ctx = createMockContext();
      await handleStartCommand(ctx, "https://mysterynetwork.com/app");

      const [, options] = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(options.reply_markup).toBeDefined();
    });

    it("/help should reply with command catalog", async () => {
      const ctx = createMockContext();
      await handleHelpCommand(ctx);

      const [msg] = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(msg).toBe(TELEGRAM_MESSAGES.HELP);
    });

    it("/about should reply with platform concept", async () => {
      const ctx = createMockContext();
      await handleAboutCommand(ctx);

      const [msg] = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(msg).toBe(TELEGRAM_MESSAGES.ABOUT);
    });

    it("/play should show fallback message when Mini App is not configured", async () => {
      const ctx = createMockContext();
      await handlePlayCommand(ctx, undefined);

      const [msg] = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(msg).toBe(TELEGRAM_MESSAGES.PLAY_UNAVAILABLE);
    });

    it("/play should offer launch button when Mini App is configured", async () => {
      const ctx = createMockContext();
      await handlePlayCommand(ctx, "https://mysterynetwork.com/app");

      const [msg, options] = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(msg).toContain("Launch the network console below");
      expect(options.reply_markup).toBeDefined();
    });

    it("/profile should reply with dossier notice", async () => {
      const ctx = createMockContext();
      await handleProfileCommand(ctx);

      const [msg] = (ctx.reply as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(msg).toBe(TELEGRAM_MESSAGES.PROFILE_INFO);
    });
  });

  describe("Webhook API Route Handler (POST /api/telegram/webhook)", () => {
    it("should reject requests without secret token with HTTP 401", async () => {
      const req = new Request("http://localhost:3000/api/telegram/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_id: 12345 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Unauthorized");
    });

    it("should reject malformed JSON with HTTP 400 when secret token is present", async () => {
      const testSecret = "test-webhook-secret-phase-03";
      process.env.TELEGRAM_WEBHOOK_SECRET = testSecret;

      const req = new Request("http://localhost:3000/api/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-bot-api-secret-token": testSecret,
        },
        body: "{ invalid json string",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Bad Request");
    });

    it("should reject GET requests with HTTP 405 Method Not Allowed", async () => {
      const res = await GET();
      expect(res.status).toBe(405);
    });
  });
});

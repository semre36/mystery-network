import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
import { AppError } from "@/lib/errors/app-error";
import { formatLogEntry } from "@/lib/logger";

describe("Foundation Utilities", () => {
  describe("cn() utility", () => {
    it("should merge basic class names correctly", () => {
      const result = cn("text-red-500", "bg-black");
      expect(result).toBe("text-red-500 bg-black");
    });

    it("should resolve conflicting Tailwind classes favoring the latter", () => {
      const result = cn("p-4", "p-8");
      expect(result).toBe("p-8");
    });

    it("should handle conditionals and falsy values", () => {
      const result = cn("base", false && "hidden", null, undefined, "active");
      expect(result).toBe("base active");
    });
  });

  describe("AppError", () => {
    it("should encapsulate status code, error code and operational flag", () => {
      const err = new AppError("Invalid clue payload", 400, "BAD_REQUEST", true, {
        field: "clueId",
      });
      expect(err.message).toBe("Invalid clue payload");
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.isOperational).toBe(true);
      expect(err.details).toEqual({ field: "clueId" });
    });

    it("should serialize to JSON cleanly", () => {
      const err = new AppError("Unauthorized attempt", 401, "UNAUTHORIZED");
      const json = err.toJSON();
      expect(json).toEqual({
        name: "AppError",
        message: "Unauthorized attempt",
        code: "UNAUTHORIZED",
        statusCode: 401,
      });
    });
  });

  describe("logger sanitization", () => {
    it("should redact sensitive fields such as tokens, passwords, and secrets", () => {
      const entry = formatLogEntry("info", "Test operation", {
        token: "super-secret-token-12345",
        password: "user_password",
        evidence: "classified-clue-secret",
        normalField: "public-value",
      });

      expect(entry.context?.token).toBe("[REDACTED]");
      expect(entry.context?.password).toBe("[REDACTED]");
      expect(entry.context?.evidence).toBe("[REDACTED]");
      expect(entry.context?.normalField).toBe("public-value");
    });
  });
});

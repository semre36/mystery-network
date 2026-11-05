import type { LogContext, LogLevel } from "@/types";

/**
 * Sensitive field patterns that must never be written to logs.
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /evidence/i,
  /hash/i,
];

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const sanitized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

export function formatLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context: sanitizeContext(context) } : {}),
  };
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== "production") {
      const entry = formatLogEntry("debug", message, context);
      console.debug(JSON.stringify(entry));
    }
  },

  info(message: string, context?: LogContext): void {
    const entry = formatLogEntry("info", message, context);
    console.info(JSON.stringify(entry));
  },

  warn(message: string, context?: LogContext): void {
    const entry = formatLogEntry("warn", message, context);
    console.warn(JSON.stringify(entry));
  },

  error(message: string, context?: LogContext): void {
    const entry = formatLogEntry("error", message, context);
    console.error(JSON.stringify(entry));
  },
};

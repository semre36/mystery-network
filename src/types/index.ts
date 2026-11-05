/**
 * MYSTERY NETWORK — Core Type Definitions
 * Shared types for foundational application state, responses, and boundaries.
 */

export type AppEnvironment = "development" | "test" | "production";

export type HealthStatus = "operational" | "degraded" | "maintenance";

export interface HealthCheckResponse {
  application: string;
  status: HealthStatus;
  timestamp: string;
  version: string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

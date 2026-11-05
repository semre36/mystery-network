import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";
import { APP_NAME, APP_VERSION } from "@/lib/constants/app";

describe("Health Check API (/api/health)", () => {
  it("should return HTTP 200 with operational status and metadata", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.application).toBe(APP_NAME);
    expect(body.status).toBe("operational");
    expect(body.version).toBe(APP_VERSION);
    expect(body.timestamp).toBeDefined();

    // Verify timestamp is a valid ISO string
    const parsedDate = new Date(body.timestamp);
    expect(parsedDate.toISOString()).toBe(body.timestamp);
  });

  it("should include Cache-Control no-store header to avoid caching stale health data", async () => {
    const response = await GET();
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("no-store");
  });
});

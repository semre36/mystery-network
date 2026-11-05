import { NextResponse } from "next/server";
import { APP_NAME, APP_VERSION } from "@/lib/constants/app";
import type { HealthCheckResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const responseData: HealthCheckResponse = {
    application: APP_NAME,
    status: "operational",
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  };

  return NextResponse.json(responseData, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

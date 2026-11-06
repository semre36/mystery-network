import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/modules/cases/services/case.service";
import { CaseQuerySchema } from "@/modules/cases/validation/case-query.schema";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const rawQuery: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      rawQuery[key] = value;
    });

    const parsed = CaseQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid case query parameters",
          code: "INVALID_QUERY_PARAMS",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await CaseService.getPublishedCases(parsed.data);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(error.details ? { details: error.details } : {}),
        },
        { status: error.statusCode }
      );
    }

    logger.error("Unexpected error retrieving published cases", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Failed to retrieve case catalog",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

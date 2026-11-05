import { NextResponse } from "next/server";
import { getCurrentSession } from "@/modules/authentication/guards/auth.guard";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const result = await getCurrentSession();

  if (!result.authenticated) {
    return NextResponse.json(
      {
        authenticated: false,
        reason: result.reason,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: result.user,
    },
    { status: 200 }
  );
}

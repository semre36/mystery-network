import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/modules/authentication/constants/auth.constants";
import { SessionService } from "@/modules/authentication/services/session.service";
import { getSessionCookieOptions } from "@/modules/authentication/utils/cookie.util";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    await SessionService.revokeSession(sessionCookie.value);
  }

  // Clear cookie with maxAge: 0
  const clearOptions = getSessionCookieOptions("", true);
  cookieStore.set(clearOptions.name, "", {
    httpOnly: clearOptions.httpOnly,
    secure: clearOptions.secure,
    sameSite: clearOptions.sameSite,
    path: clearOptions.path,
    maxAge: 0,
  });

  return NextResponse.json({ ok: true, message: "Logged out successfully" }, { status: 200 });
}

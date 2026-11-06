import { cookies } from "next/headers";
import { AppError } from "@/lib/errors/app-error";
import { SESSION_COOKIE_NAME } from "../constants/auth.constants";
import { SessionService } from "../services/session.service";
import type { SafeUserProfile, SessionValidationResult } from "../types/auth.types";

/**
 * Retrieves and validates the current session from request cookies.
 */
export async function getCurrentSession(): Promise<SessionValidationResult> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return { authenticated: false, reason: "No session cookie present" };
  }

  return SessionService.validateSession(sessionCookie.value);
}

/**
 * Returns the currently authenticated safe user profile, or null if unauthenticated.
 */
export async function getCurrentUser(): Promise<SafeUserProfile | null> {
  const sessionResult = await getCurrentSession();

  if (!sessionResult.authenticated) {
    return null;
  }

  return sessionResult.user;
}

/**
 * Enforces authentication. Throws AppError(401) if no active valid session exists.
 * Use inside protected server components, server actions, or route handlers.
 */
export async function requireAuthenticatedUser(): Promise<SafeUserProfile> {
  const sessionResult = await getCurrentSession();

  if (!sessionResult.authenticated) {
    if (sessionResult.reason?.startsWith("Account status is")) {
      throw new AppError(`Access denied: ${sessionResult.reason}`, 403, "ACCOUNT_INACTIVE");
    }
    throw new AppError("Authentication required to access this resource", 401, "UNAUTHORIZED");
  }

  if (sessionResult.user.status === "BANNED" || sessionResult.user.status === "SUSPENDED") {
    throw new AppError(
      `Access denied: Account status is ${sessionResult.user.status}`,
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  return sessionResult.user;
}

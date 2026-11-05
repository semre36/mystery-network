/**
 * MYSTERY NETWORK — Authentication Constants
 */

export const SESSION_COOKIE_NAME = "mn_session";

// Session lifespan: 30 days
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Telegram initData freshness window: 5 minutes (300 seconds)
export const INIT_DATA_MAX_AGE_SECONDS = 300;

// Maximum acceptable future clock skew: 10 seconds
export const MAX_CLOCK_SKEW_SECONDS = 10;

// Default investigator progression levels
export const DEFAULT_PLAYER_LEVEL = 1;
export const DEFAULT_PLAYER_XP = 0;

# MYSTERY NETWORK — Development Roadmap

This document outlines the 14 approved phases for building the MYSTERY NETWORK collaborative detective platform.

---

## Roadmap Overview

| Phase  | Title                              |                                                  Status                                                   | Primary Focus                                                                                                   |
| :----: | :--------------------------------- | :-------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------- |
| **01** | **Project Foundation**             |                                               **Completed**                                               | Modular Monolith scaffolding, strict TypeScript, Tailwind CSS, health check, baseline tests, architecture docs. |
| **02** | **Database Architecture & Prisma** |                                               **Completed**                                               | Neon PostgreSQL, Prisma schema, relational data modeling, migrations, connection pooling.                       |
| **03** | **Telegram Bot Integration**       | **Completed (Bot Implementation & Webhook Architecture Ready, Live Webhook Setup Ready for Fresh Token)** | Telegram Bot API setup, webhook lifecycle, bot commands, onboarding links.                                      |
| **04** | **Telegram Authentication**        |                                               **Completed**                                               | HMAC-SHA256 initData cryptographic verification, session issuance, secure auth tokens.                          |
| **05** | **Player Interface**               |                                               **Completed**                                               | Investigator dossier, profile setup, preferences, active case status view.                                      |
| **06** | Case Management                    |                                                  Pending                                                  | Case catalog, difficulty ratings, acts, episodic releases, immutable case definitions.                          |
| **07** | Investigation Engine               |                                                  Pending                                                  | Session state machine, investigation timelines, stage transitions, progress tracking.                           |
| **08** | Evidence System                    |                                                  Pending                                                  | Asymmetric clue distribution, clue cards, forensic document viewer, IDOR protection.                            |
| **09** | Team Collaboration                 |                                                  Pending                                                  | Squad formation, invite codes, squad detective rooms, safe clue sharing channels.                               |
| **10** | Interactive Puzzles                |                                                  Pending                                                  | Minigames, cipher decoders, cryptograms, logic puzzles, server-side validation.                                 |
| **11** | Investigation Board                |                                                  Pending                                                  | Interactive canvas/graph for linking suspects, clues, timelines, and motives.                                   |
| **12** | Submissions and Rewards            |                                                  Pending                                                  | Final theory filing, evidence citation, evaluation scoring, XP, detective badges.                               |
| **13** | Admin Dashboard                    |                                                  Pending                                                  | Authoring studio for cases, content moderation, user auditing, system metrics.                                  |
| **14** | Testing, Optimization & Deployment |                                                  Pending                                                  | End-to-end load testing, security audits, caching optimization, production deployment.                          |

---

## Phase 01: Project Foundation — Acceptance Checklist

- [x] Initial project inspection completed (Node v24.19.0, npm 12.0.2, Git).
- [x] Next.js App Router application initialized directly in root directory.
- [x] Strict TypeScript configuration enabled (`tsconfig.json`).
- [x] Tailwind CSS v4 styling configured (`postcss.config.mjs`, `globals.css`).
- [x] Code quality tools configured (`eslint.config.mjs`, `.prettierrc`).
- [x] Modular monolith directory structure established (`src/modules/*`, `src/lib/*`, `src/server/*`).
- [x] Centralized structured logger implemented with sensitive data redaction.
- [x] Standard application error hierarchy established (`AppError`).
- [x] Centralized configuration validation implemented via Zod.
- [x] Minimal, professional dark landing page implemented meeting all visual/copy requirements.
- [x] Health check endpoint implemented (`GET /api/health`).
- [x] Comprehensive documentation created (`docs/*`).
- [x] Foundation unit and integration tests created (`tests/*`).
- [x] TypeScript compilation verified (`npm run typecheck`).
- [x] Code formatting verified (`npm run format:check`).
- [x] Linting verified (`npm run lint`).
- [x] Automated tests passing (`npm run test` — 8/8 tests passed).
- [x] Production build verified (`npm run build`).
- [x] No premature Phase 02+ features implemented.

---

## Phase 02: Database Architecture & Prisma — Acceptance Checklist

- [x] Prisma CLI and `@prisma/client` installed (`v6.19.3`).
- [x] Normalized relational schema designed across 10 domains with 27 models and 20 enums (`prisma/schema.prisma`).
- [x] Clear architectural separation between immutable Case Content and execution-specific Investigations.
- [x] Safe Telegram 64-bit ID storage configured (`User.telegramId BigInt @unique`).
- [x] UUID primary keys and deliberate deletion behaviors configured (e.g. `RESTRICT` on player/case history).
- [x] Performance indexes configured for high-volume queries (leaderboards, clue assignments, unread alerts).
- [x] Server-only Prisma client singleton implemented (`src/server/infrastructure/database/index.ts`).
- [x] Idempotent development seed script implemented (`prisma/seed.ts`).
- [x] Prisma schema validated (`npm run db:validate`).
- [x] Prisma client generated successfully (`npm run db:generate`).
- [x] Neon connection pooling (`DATABASE_URL`) and direct migration URL (`DIRECT_URL`) documented in `.env.example`.
- [x] Automated database model and enum test suite implemented (`tests/database.test.ts`).
- [x] Comprehensive database architecture documentation with Mermaid ER diagram created (`docs/DATABASE_ARCHITECTURE.md`).
- [x] Existing Phase 01 functionality verified without regressions (typecheck, lint, build, all 23 tests passing).
- [x] Remote Neon PostgreSQL credentials configured in private environment (`.env`).
- [x] Initial migration applied against live Neon database (`20261105194152_init_mystery_network`).
- [x] Live database seed verified against live Neon database (idempotent, verified via `npm run db:seed`).
- [x] Live Neon database query and content retrieval verified in automated tests.

---

## Phase 03: Telegram Bot Integration — Acceptance Checklist

- [x] Official `grammy` library installed (`v1.46.0`).
- [x] Telegram module architecture created (`src/modules/telegram/`).
- [x] Server-only bot initialization module implemented with error handling (`src/modules/telegram/bot/bot.ts`).
- [x] All required bot commands implemented (`/start`, `/help`, `/about`, `/play`, `/profile`).
- [x] Telegram deep-linking parser implemented and validated (`invite_TEAMCODE`, `case_CASECODE`).
- [x] Dynamic Mini App inline keyboard launcher implemented (`buildMainMenuKeyboard`, `buildPlayKeyboard`).
- [x] Official Bot command menu definitions implemented (`setMyCommands`).
- [x] Webhook route handler implemented (`POST /api/telegram/webhook`).
- [x] Timing-safe secret token verification implemented (`crypto.timingSafeEqual`).
- [x] Unauthenticated or malformed webhook requests properly rejected (HTTP 401 / 400).
- [x] Administrative CLI management tool created (`scripts/telegram-setup.ts`).
- [x] Comprehensive Telegram documentation created (`docs/TELEGRAM_BOT.md`).
- [x] Unit and integration tests passing (`tests/telegram.test.ts` — 23 tests, 47 total tests passing).
- [x] No premature Phase 04+ authentication or gameplay features implemented.
- [ ] Fresh bot token generated from @BotFather and configured in private `.env.local` by developer.
- [ ] Public HTTPS webhook registered with Telegram Bot API (`npm run telegram:set-webhook`).

---

## Phase 04: Telegram Authentication — Acceptance Checklist

- [x] Server-side cryptographic verification of Telegram Mini App `initData` implemented via `@tma.js/init-data-node`.
- [x] Signature verification enforces HMAC-SHA256 with the bot token.
- [x] Freshness verification enforces maximum age of 300 seconds (`EXPIRED_INIT_DATA`).
- [x] Clock-skew tolerance enforces rejection of timestamps > 10s in the future (`FUTURE_AUTH_DATE`).
- [x] Zero client-side identity trust — identity strictly extracted from cryptographically verified payload.
- [x] 64-bit Telegram ID safety implemented (`SafeUserProfile` serializes BigInt to string to eliminate JS precision truncation).
- [x] Isolated database transaction creates `User` + `PlayerProfile` for first-time players.
- [x] Auto-generated distinct codename (`AGENT_<USERNAME>` or fallback) with collision resolution.
- [x] Returning player data integrity guaranteed: existing codenames, levels, XP, and ranks are never overwritten or reset.
- [x] Server-side session management model `AuthSession` migrated to live Neon database (`20261105203615_add_auth_sessions`).
- [x] 256-bit cryptographically secure session tokens generated (`crypto.randomBytes(32)`).
- [x] Persistent session tokens stored solely as SHA-256 digests in database (`tokenHash`).
- [x] Hardened HTTP-only session cookies configured (`SameSite=None; Secure` in production for Telegram iframe/WebView compatibility).
- [x] Session revocation implemented for individual sessions and all active sessions of a user.
- [x] Authentication API endpoints implemented: `POST /api/auth/telegram`, `GET /api/auth/session`, `POST /api/auth/logout`.
- [x] Centralized server-side route guards implemented (`getCurrentSession`, `getCurrentUser`, `requireAuthenticatedUser`).
- [x] Official Telegram WebApp SDK script mounted on layout (`https://telegram.org/js/telegram-web-app.js`).
- [x] Interactive client authentication widget implemented (`TelegramAuthWidget`) handling loading, authenticated, error, and outside-telegram states.
- [x] Comprehensive test suite implemented (`tests/auth.test.ts` — 31 tests; 78 total tests passing across all suites).
- [x] Complete architecture and security documentation authored (`docs/TELEGRAM_AUTHENTICATION.md`).
- [x] Zero regressions across Phase 01–03 features; strict TypeScript compilation, linting, formatting, and Next.js production build verified.

---

## Phase 05: Player Interface & Investigator Dossier — Acceptance Checklist

- [x] Deep navy intelligence aesthetic established with refined cyan and amber accents.
- [x] Authenticated application shell implemented (`AppShell`) with desktop sidebar, mobile header, and bottom touch navigation.
- [x] Mobile and Telegram Mini App safe-area insets handled (`pb-[max(0.5rem,env(safe-area-inset-bottom))]`) with zero horizontal overflow.
- [x] Main dashboard implemented at `/dashboard` with identity header, dossier card, progression panel, investigation overview, commendations, and activity log.
- [x] Real database metrics queried from Neon PostgreSQL (active cases, solved cases, assigned clues, unlocked achievements).
- [x] Honest empty states implemented (zero fake leveling bars, zero simulated investigations, zero fabricated timelines).
- [x] Rank classification hierarchy established (`INVESTIGATOR_RANKS`, `getRankForLevel`) mapping levels 1 through 20+ to operational badges (`OP-1` to `MST-5`).
- [x] Profile management page implemented at `/profile` (`ProfileForm`) allowing customization of callsign, display name, specialization, theme, and language.
- [x] Strict server-side profile update validation with Zod (`updateProfileSchema`) rejecting unauthorized mutation of protected fields (`xp`, `level`, `rank`, `status`).
- [x] Codename uniqueness enforced with HTTP 409 (`CODENAME_TAKEN`) conflict handling.
- [x] Secure API endpoints implemented: `GET /api/player/me` and `PATCH /api/player/profile`.
- [x] Standby clearance briefings implemented for future roadmap modules (`/cases`, `/evidence`, `/board`, `/teams`, `/achievements`).
- [x] Server-side route protection enforced via `getCurrentUser()` and `requireAuthenticatedUser()`.
- [x] Comprehensive automated test suite implemented (`tests/player.test.ts` — 23 tests, 101 total tests passing).
- [x] Complete documentation authored (`docs/PLAYER_INTERFACE.md`).
- [x] Zero regressions across Phase 01–04 features; strict TypeScript compilation, linting, formatting, and Next.js production build verified.

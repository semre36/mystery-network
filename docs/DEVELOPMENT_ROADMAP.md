# MYSTERY NETWORK — Development Roadmap

This document outlines the 14 approved phases for building the MYSTERY NETWORK collaborative detective platform.

---

## Roadmap Overview

| Phase  | Title                              |    Status     | Primary Focus                                                                                                   |
| :----: | :--------------------------------- | :-----------: | :-------------------------------------------------------------------------------------------------------------- |
| **01** | **Project Foundation**             | **Completed** | Modular Monolith scaffolding, strict TypeScript, Tailwind CSS, health check, baseline tests, architecture docs. |
| **02** | **Database Architecture & Prisma** | **Completed** | Neon PostgreSQL, Prisma schema, relational data modeling, migrations, connection pooling.                       |
| **03** | Telegram Bot Integration           |    Pending    | Telegram Bot API setup, webhook lifecycle, bot commands, onboarding links.                                      |
| **04** | Telegram Authentication            |    Pending    | HMAC-SHA256 initData cryptographic verification, session issuance, secure auth tokens.                          |
| **05** | Player Interface                   |    Pending    | Investigator dossier, profile setup, preferences, active case status view.                                      |
| **06** | Case Management                    |    Pending    | Case catalog, difficulty ratings, acts, episodic releases, immutable case definitions.                          |
| **07** | Investigation Engine               |    Pending    | Session state machine, investigation timelines, stage transitions, progress tracking.                           |
| **08** | Evidence System                    |    Pending    | Asymmetric clue distribution, clue cards, forensic document viewer, IDOR protection.                            |
| **09** | Team Collaboration                 |    Pending    | Squad formation, invite codes, squad detective rooms, safe clue sharing channels.                               |
| **10** | Interactive Puzzles                |    Pending    | Minigames, cipher decoders, cryptograms, logic puzzles, server-side validation.                                 |
| **11** | Investigation Board                |    Pending    | Interactive canvas/graph for linking suspects, clues, timelines, and motives.                                   |
| **12** | Submissions and Rewards            |    Pending    | Final theory filing, evidence citation, evaluation scoring, XP, detective badges.                               |
| **13** | Admin Dashboard                    |    Pending    | Authoring studio for cases, content moderation, user auditing, system metrics.                                  |
| **14** | Testing, Optimization & Deployment |    Pending    | End-to-end load testing, security audits, caching optimization, production deployment.                          |

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

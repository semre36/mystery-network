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
| **06** | **Case Management**                |                                               **Completed**                                               | Case catalog, difficulty ratings, acts, episodic releases, immutable case definitions.                          |
| **07** | **Investigation Engine**           |                                               **Completed**                                               | Session state machine, investigation timelines, stage transitions, progress tracking.                           |
| **08** | **Evidence System**                |                                               **Completed**                                               | Asymmetric clue distribution, clue cards, forensic document viewer, IDOR protection.                            |
| **09** | **Team Collaboration**             |                                               **Completed**                                               | Squad formation, invite codes, squad detective rooms, safe clue sharing channels.                               |
| **10** | **Interactive Puzzles**            |                                               **Completed**                                               | Minigames, cipher decoders, cryptograms, logic puzzles, server-side validation.                                 |
| **11** | **Investigation Board**            |                                               **Completed**                                               | Interactive corkboard canvas, evidence relationships, timeline forensics, and hypothesis formulation.           |
| **12** | **Submissions and Rewards**        |                                               **Completed**                                               | Final theory filing, evidence citation, evaluation scoring, XP, detective badges.                               |
| **13** | **Admin Dashboard & CMS**          |                                               **Completed**                                               | Authoring studio for cases, content moderation, user auditing, system metrics.                                  |
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

---

## Phase 06: Case Management & Discovery System — Acceptance Checklist

- [x] Public DTO isolation established (`SafeCaseSummaryDto`, `SafeCaseDetailDto`, `SafeCampaignSummaryDto`, `SafeCampaignDetailDto`, `SafeChapterDto`, `SafeCharacterDto`).
- [x] Absolute OPSEC & zero content leakage: clues, puzzles, cryptographic solution hashes, internal scoring rules, and hidden notes are strictly redacted from all public discovery endpoints.
- [x] Strict publication boundary enforcement: only `ContentStatus.PUBLISHED` content is queryable; draft/archived cases and campaigns return HTTP 404 (`CASE_NOT_FOUND` / `CAMPAIGN_NOT_FOUND`).
- [x] Case querying schema implemented with Zod (`CaseQuerySchema`) supporting keyword search, threat tier filters (`EASY`, `MEDIUM`, `HARD`, `EXPERT`), campaign filters, multiple sort orders, and bounded pagination.
- [x] Core case service implemented (`CaseService`) with `getPublishedCases`, `getCaseByIdOrCode`, `getFeaturedCase`, `getPublishedCampaigns`, and `getCampaignBySlug`.
- [x] Dual identifier lookup supported for cases: valid UUID or human-readable `caseCode` (e.g. `CASE-001-MIDNIGHT-PROTOCOL`).
- [x] Public character metadata whitelisting: extracts safe attributes (`role`, `clearance`, `location`) while stripping internal secrets.
- [x] REST API endpoints implemented: `GET /api/cases`, `GET /api/cases/[caseId]`, `GET /api/campaigns`, `GET /api/campaigns/[slug]`.
- [x] Case Operations directory implemented at `/cases` with priority hero banner (`FeaturedCaseBanner`), interactive search & filter bar (`CaseSearchFilters`), dossier catalog grid (`CaseCard`), and pagination (`CasePagination`).
- [x] Classified Case Briefing view implemented at `/cases/[caseId]` with narrative synopsis, threat specifications, persons of interest roster, and locked/unlocked act breakdown.
- [x] Campaigns directory implemented at `/campaigns` (`CampaignCard`) and campaign detail view at `/campaigns/[slug]`.
- [x] Application sidebar navigation updated: `/cases` activated, `/campaigns` directory added with persistent route highlight.
- [x] Comprehensive automated test suite implemented (`tests/cases.test.ts` — 28 tests, 129 total tests passing across all suites).
- [x] Complete architecture and security documentation authored (`docs/CASE_MANAGEMENT.md`).
- [x] Zero regressions across Phase 01–05 features; strict TypeScript compilation, linting, formatting, and Next.js production build verified.

---

## Phase 07: Investigation Engine & Session Management — Acceptance Checklist

- [x] Architectural separation maintained: immutable case content definitions separated from dynamic, multi-participant investigation executions.
- [x] Investigation lifecycle & state machine implemented supporting `NOT_STARTED`, `IN_PROGRESS`, `PAUSED`, `SOLVED`, `FAILED`, and `ABANDONED`.
- [x] Schema migration applied safely to Neon PostgreSQL (`20261106072951_add_paused_to_investigation_status`) to support tactical session pauses.
- [x] Concurrency safety & session reuse policy implemented: interactive database transactions prevent duplicate active sessions on double-click; automatically resumes paused sessions.
- [x] Sequential chapter progression engine implemented: Act 1 begins in `IN_PROGRESS`; subsequent chapters initialize as `LOCKED`; concluding an act automatically unlocks the subsequent act.
- [x] Strict server-side participant authorization: investigations are accessible only to authenticated active operatives; non-participants receive 404 (`INVESTIGATION_NOT_FOUND`) to prevent ID existence probing.
- [x] State machine transition guards: validates that paused investigations can resume, only active sessions can be paused or concluded, and concluded/abandoned sessions remain immutable.
- [x] Investigation domain service implemented (`InvestigationService`) with `startInvestigation`, `getInvestigationWorkspace`, `getPlayerInvestigations`, `transitionStatus`, and `updateChapterProgress`.
- [x] REST API endpoints implemented: `POST /api/investigations`, `GET /api/investigations`, `GET /api/investigations/[investigationId]`, `PATCH /api/investigations/[investigationId]/status`, `GET /api/investigations/[investigationId]/progress`, and `PATCH /api/investigations/[investigationId]/progress`.
- [x] Operative workspace implemented at `/investigations/[investigationId]` featuring `WorkspaceHeader`, `ChapterProgressionBoard`, Persons of Interest roster, and peripheral module placeholders.
- [x] Investigation history directory implemented at `/investigations` with status tabs (`All`, `Active`, `Paused`, `Solved`) and `InvestigationCard`.
- [x] Interactive `StartInvestigationButton` integrated into the case briefing page (`/cases/[caseId]`).
- [x] Navigation sidebar and mobile navigation bar updated to include active investigations.
- [x] Comprehensive automated test suite implemented (`tests/investigations.test.ts` — 24 tests, 153 total tests passing across all suites).
- [x] Complete architecture and lifecycle documentation authored (`docs/INVESTIGATION_ENGINE.md`).
- [x] Zero regressions across Phase 01–06 features; strict TypeScript compilation, linting, formatting, and Next.js production build verified.

---

## Phase 08: Evidence System, Clue Distribution & Investigation Analysis — Acceptance Checklist

- [x] Prisma schema enhanced with `clueCode`, `EvidenceShare.revokedAt`, and `EvidenceNote` model with relations and indexes.
- [x] Database migration applied to live Neon PostgreSQL (`20261106120535_add_evidence_notes_and_clue_enhancements`).
- [x] Benchmark clues seeded for `CASE-001-MIDNIGHT-PROTOCOL` (`EVID-ZR-01` through `EVID-ZR-05`) with multi-act gating and image/audio assets.
- [x] Data transfer objects and validation schemas created (`SafeEvidenceSummaryDto`, `SafeEvidenceDetailDto`, `SaveEvidenceNoteSchema`, `ShareEvidenceSchema`, `EvidenceQuerySchema`).
- [x] Secure storage abstraction implemented (`StorageService`) with MIME validation, 10 MB file ceiling, random UUID keys, and path traversal protection.
- [x] Evidence domain service implemented (`EvidenceService`) supporting provisioning, asymmetric distribution, secure detail retrieval, note editing, and squad sharing.
- [x] Asymmetric clue distribution: private clues (`ASYMMETRIC_EXCLUSIVE`) accessible only to assigned operative until explicitly shared.
- [x] Explicit evidence sharing protocol implemented with investigation participant validation, anti-duplicate protection, and audit logging.
- [x] Private field notes isolated per operative with unique compound constraints `(investigationId, clueId, playerId)`.
- [x] Anti-IDOR security: uniform HTTP 404 (`EVIDENCE_NOT_FOUND`) on unauthorized access, non-members, or locked chapter clues.
- [x] REST API endpoints implemented:
  - `GET /api/investigations/[investigationId]/evidence`
  - `GET /api/investigations/[investigationId]/evidence/[evidenceId]`
  - `POST /api/investigations/[investigationId]/evidence/[evidenceId]/notes`
  - `POST /api/investigations/[investigationId]/evidence/[evidenceId]/share`
  - `GET /api/investigations/[investigationId]/evidence/shared`
- [x] Operative Evidence Vault page implemented at `/investigations/[investigationId]/evidence` with real-time filters, scope badges, search, and detail modal.
- [x] Interactive Evidence UI components implemented (`EvidenceCard`, `EvidenceFilters`, `EvidenceDetailModal`, `EvidenceNotesEditor`, `EvidenceShareDialog`).
- [x] Automated test suite implemented (`tests/evidence.test.ts` — 20 tests; 181 total tests passing across 9 test files).
- [x] Complete documentation authored (`docs/EVIDENCE_SYSTEM.md`).
- [x] Zero regressions across Phase 01–07 features; strict TypeScript compilation, linting, formatting, and Next.js production build verified.

---

## Phase 09: Team Collaboration & Multiplayer Investigation System — Acceptance Checklist

- [x] Prisma schema enhanced with `Team.description`, `Team.avatarUrl`, `TeamInvitation.invitedPlayerId`, `TeamInvitation.acceptedAt`, `TeamInvitation.revokedAt`, and `InvitationStatus.DECLINED`.
- [x] Database migration applied to live Neon PostgreSQL (`20261106131500_add_team_collaboration_and_invitation_enhancements`).
- [x] Domain types and Zod validation schemas implemented (`CreateTeamSchema`, `UpdateTeamSchema`, `CreateInvitationSchema`, `TransferLeadershipSchema`, `StartTeamInvestigationSchema`).
- [x] Centralized squad security guards implemented (`TeamGuard`) with uniform HTTP 404 anti-probing defense and Lead Investigator role authorization.
- [x] Squad domain service implemented (`TeamService`): creation, squad retrieval, dossier inspection, metadata updates, voluntary departure (with sole-leader protection and auto-disband), member removal, and leadership transfer.
- [x] Cryptographic invitation token pipeline implemented (`InvitationService`): 256-bit random entropy, SHA-256 database hashing, sanitized public preview, single-use atomic acceptance, decline, and revocation.
- [x] Multiplayer investigation coordination implemented in `InvestigationService`:
  - `startInvestigation` supports `options.teamId`, validates Lead Investigator authority, sets `playMode: PlayMode.COOPERATIVE`, creates multi-participant sessions, and provisions Act 1 clues.
  - Concurrency locking with PostgreSQL advisory locks prevents duplicate squad investigation creation.
  - `joinTeamInvestigation` activates team members in `InvestigationParticipant` and provisions eligible `ALL_PLAYERS` clues for the active chapter.
  - Strict preservation of `ASYMMETRIC_EXCLUSIVE` clue isolation: exclusive clues already assigned to an operative are never transferred or reassigned.
  - Solo investigations remain 100% functional with zero regressions.
- [x] REST API endpoints implemented:
  - `GET /api/teams`
  - `POST /api/teams`
  - `GET /api/teams/[teamId]`
  - `PATCH /api/teams/[teamId]`
  - `GET /api/teams/[teamId]/members`
  - `DELETE /api/teams/[teamId]/members/me`
  - `DELETE /api/teams/[teamId]/members/[userId]`
  - `POST /api/teams/[teamId]/transfer-leadership`
  - `GET /api/teams/[teamId]/invitations`
  - `POST /api/teams/[teamId]/invitations`
  - `DELETE /api/teams/[teamId]/invitations/[invitationId]`
  - `GET /api/invitations/[token]`
  - `POST /api/invitations/[token]/accept`
  - `POST /api/invitations/[token]/decline`
  - `POST /api/investigations/[investigationId]/join`
- [x] Interactive UI pages and components implemented:
  - `/teams` (Squads Directory & My Teams dashboard)
  - `/teams/[teamId]` (Squad Detail Dossier, Operative Roster, and Active Squad Operations)
  - `/invitations/[token]` (Public/Authenticated Commission Landing Page)
  - Modals: `CreateTeamModal`, `InviteMemberModal`, `TransferLeadershipModal`
  - Investigation workspace updated: Squad callsign badge, active unit roster, and deployment banner for squad members.
  - Navigation sidebar updated: `/teams` activated and highlighted.
- [x] Automated test suite implemented (`tests/teams.test.ts` — 18 tests; 211 total tests passing across all 10 test files).
- [x] Architecture and API documentation authored (`docs/TEAM_COLLABORATION.md`).
- [x] Zero regressions across Phase 01–08 features; strict TypeScript compilation, linting, formatting, and Next.js production build verified.

---

## Phase 10: Interactive Puzzle Engine & Investigation Challenges — Acceptance Checklist

- [x] Extended Prisma schema:
  - Extended `PuzzleType` enum with 7 types (`CAESAR_CIPHER`, `SUBSTITUTION_CIPHER`, `VIGENERE_CIPHER`, `HIDDEN_MESSAGE`, `LOGIC_CHALLENGE`, `ACCESS_CODE`, `MULTI_STAGE`).
  - Added `PuzzleProgressStatus` enum (`LOCKED`, `UNLOCKED`, `IN_PROGRESS`, `SOLVED`, `FAILED`).
  - Extended `Puzzle` model with `instructions`, `publicConfiguration`, `secretConfiguration`, `maxAttempts`, `order`, `isMultiStage`.
  - Added `PuzzleStage` model (`puzzleId`, `stageOrder`, `title`, `instructions`, `puzzleType`, `publicConfiguration`, `secretConfiguration`, `solutionHash`, `maxAttempts`, `@@unique([puzzleId, stageOrder])`).
  - Extended `PuzzleAttempt` with `stageId` and `isCorrect`.
  - Added `PuzzleProgress` model (`puzzleId`, `investigationId`, `status`, `currentStageOrder`, `completedAt`, `solvedByPlayerId`, `@@unique([puzzleId, investigationId])`).
  - Added `PuzzleHint` and `InvestigationUnlockedHint` models for progressive tactical assistance.
- [x] Database migration applied to live Neon PostgreSQL (`20261106113507_add_puzzle_engine_and_stages`).
- [x] Cryptographic normalization and timing-safe keyed HMAC-SHA256 comparison implemented (`crypto.util.ts`).
- [x] Pluggable challenge validators implemented under `PuzzleValidatorRegistry`:
  - `CaesarCipherValidator`
  - `SubstitutionCipherValidator`
  - `VigenereCipherValidator`
  - `HiddenMessageValidator`
  - `LogicChallengeValidator`
  - `AccessCodeValidator`
- [x] Access guard implemented (`PuzzleGuard`) with active profile, participant, squad membership, and act unlock checks.
- [x] Domain service implemented (`PuzzleService`):
  - Secret separation: client DTOs strictly scrub secret configurations and solution hashes.
  - Concurrency control: `pg_advisory_xact_lock` prevents race conditions.
  - Rate limiting / attempt lockout: enforces `maxAttempts` with `HTTP 429 ATTEMPT_LIMIT_REACHED`.
  - Multi-stage sequence progression: advancing through stages until final puzzle solve.
  - Cooperative investigation progress: solving marks `PuzzleProgress` as `SOLVED` across all squad operatives.
  - Progressive hint unlock: unlocks conditionally upon fulfilling attempt thresholds.
- [x] REST API endpoints implemented under `/api/investigations/[investigationId]/puzzles/**`:
  - `GET /api/investigations/[investigationId]/puzzles`
  - `GET /api/investigations/[investigationId]/puzzles/[puzzleId]`
  - `GET /api/investigations/[investigationId]/puzzles/[puzzleId]/attempts`
  - `POST /api/investigations/[investigationId]/puzzles/[puzzleId]/attempts`
  - `GET /api/investigations/[investigationId]/puzzles/[puzzleId]/stages/[stageId]`
  - `POST /api/investigations/[investigationId]/puzzles/[puzzleId]/stages/[stageId]/attempts`
  - `POST /api/investigations/[investigationId]/puzzles/[puzzleId]/hints/[hintId]/unlock`
- [x] 5 benchmark puzzles and stages seeded in `prisma/seed.ts` for `CASE-001-MIDNIGHT-PROTOCOL`:
  1. `The Shifted Message` (Caesar cipher, Act 1, Easy)
  2. `The Broken Alphabet` (Substitution cipher, Act 1, Medium)
  3. `The Operator's Key` (Vigenère cipher, Act 2, Hard)
  4. `The Midnight Sequence` (Logic ordering challenge, Act 2, Medium)
  5. `The Classified Terminal` (Multi-stage access code, Act 2, Hard)
- [x] Frontend UI pages & interactive components:
  - `/investigations/[investigationId]/puzzles` (Challenge Directory)
  - `/investigations/[investigationId]/puzzles/[puzzleId]` (Challenge Room & Dispatch Console)
  - `PuzzleCard`: Status badges, difficulty grades, stage count, act indicators.
  - `CipherScratchpad`: Real-time Caesar slider/offset tester and Vigenère key tester.
  - `LogicOrderingScratchpad`: Interactive timeline sequence ordering tool.
  - `HintsDrawer`: Progressive conditional hint disclosure panel.
  - Integration: "Cipher Terminal" navigation link in `WorkspaceHeader` and workspace dashboard.
- [x] Comprehensive automated test suite created (`tests/puzzles.test.ts` — 23 tests; 245 total tests passing across all 11 test files).
- [x] Complete architecture documentation authored (`docs/PUZZLE_SYSTEM.md`).
- [x] Zero regressions across Phase 01–09 features; strict TypeScript compilation, linting, formatting, and Next.js production build verified.

---

## Phase 11: Investigation Board, Timelines & Theories — Acceptance Checklist

- [x] Prisma relational models & enums implemented in `prisma/schema.prisma`:
  - Enums: `BoardNodeType`, `BoardRelationshipType`, `TimePrecision`, `TheoryStatus`, `TheoryEvidenceRelationship`.
  - Models: `InvestigationBoard`, `BoardNode`, `BoardConnection`, `InvestigationTimelineEvent`, `InvestigationTheory`, `TheoryEvidence`.
- [x] Live Neon PostgreSQL migration successfully applied (`20261106123606_add_investigation_board_timelines_and_theories`).
- [x] Domain module architecture implemented under `src/modules/investigation-board`:
  - `BoardGuard`: Authentication, session verification, disbanded squad detection, and evidence declassification checks.
  - `InvestigationBoardService`: Dynamic board retrieval/initialization, viewport persistence, entity preview hydration.
  - `BoardNodeService`: Node CRUD operations with entity ownership & case verification.
  - `BoardConnectionService`: Relationship connections with self-connection rejection, cross-board validation, and duplicate prevention.
  - `TimelineService`: Chronological forensics event tracking with variable precision (`EXACT`, `APPROXIMATE`, `DATE_ONLY`, `TIME_ONLY`).
  - `TheoryService`: Deductive hypothesis formulation with supporting/contradicting evidence citations.
- [x] REST API endpoints implemented under `/api/investigations/[investigationId]`:
  - `GET /api/investigations/[investigationId]/board`
  - `PATCH /api/investigations/[investigationId]/board`
  - `POST /api/investigations/[investigationId]/board/nodes`
  - `PATCH /api/investigations/[investigationId]/board/nodes/[nodeId]`
  - `DELETE /api/investigations/[investigationId]/board/nodes/[nodeId]`
  - `POST /api/investigations/[investigationId]/board/connections`
  - `PATCH /api/investigations/[investigationId]/board/connections/[connectionId]`
  - `DELETE /api/investigations/[investigationId]/board/connections/[connectionId]`
  - `GET /api/investigations/[investigationId]/timeline`
  - `POST /api/investigations/[investigationId]/timeline`
  - `PATCH /api/investigations/[investigationId]/timeline/[eventId]`
  - `DELETE /api/investigations/[investigationId]/timeline/[eventId]`
  - `GET /api/investigations/[investigationId]/theories`
  - `POST /api/investigations/[investigationId]/theories`
  - `GET /api/investigations/[investigationId]/theories/[theoryId]`
  - `PATCH /api/investigations/[investigationId]/theories/[theoryId]`
  - `DELETE /api/investigations/[investigationId]/theories/[theoryId]`
  - `POST /api/investigations/[investigationId]/theories/[theoryId]/evidence`
  - `DELETE /api/investigations/[investigationId]/theories/[theoryId]/evidence/[associationId]`
- [x] Frontend interactive canvas & workbench components (`src/components/board/`):
  - `InvestigationBoardCanvas`: Pan & zoom corkboard workspace, drag-and-drop node positioning, real-time persistence.
  - `BoardCard`: Thematic crime board pin cards with push-pin styling, color accents, and type indicators.
  - `ConnectionLine`: SVG connection threads with drooping curves, custom colors, and relationship badges.
  - `ConnectionDialog`: Modal for establishing semantic connections between pins.
  - `EvidenceDrawer`: Slide-over drawer for browsing declassified case evidence and pinning to canvas.
  - `CharactersDrawer`: Slide-over drawer for browsing case suspects/persons of interest and pinning to canvas.
  - `TimelineDrawer`: Chronological log with exact/approximate timestamp tagging.
  - `TheoriesDrawer`: Hypothesis builder with supporting/contradicting evidence citation workbench.
- [x] Navigation routes & integration:
  - `/investigations/[investigationId]/board`: Dedicated investigation board route.
  - `/board`: Direct player route resolving to the active investigation or session picker.
  - `WorkspaceHeader`: Persistent "Crime Board" quick navigation button.
  - Case workspace dashboard: Direct Crime Board launcher card.
- [x] Comprehensive automated test suite created (`tests/investigation-board.test.ts` — 19 tests; 271 total tests passing across all 12 test files).
- [x] Architecture documentation authored (`docs/INVESTIGATION_BOARD.md`).
- [x] Zero regressions across Phase 01–10 features; strict TypeScript compilation, linting, formatting, and Next.js production build verified.

---

## Phase 12: Submissions, Evaluation Engine, Results & Player Rewards — Acceptance Checklist

- [x] Database schema enhanced in `prisma/schema.prisma`:
  - `SubmissionStatus`: added `DRAFT` status enum value.
  - `Case`: added `solutionConfig Json?` column for secret evaluation criteria.
  - `CaseSubmission`: added `title`, `submittedAt`, `createdAt`, `updatedAt`, and default status `DRAFT`.
  - `XPTransaction`: added `referenceKey String? @unique` for database-level atomic idempotency.
- [x] Neon PostgreSQL migrations applied safely (`20261106134901_add_draft_to_submission_status` & `20261106134902_add_submissions_evaluations_and_reward_idempotency`). Total 9 migrations active in Neon.
- [x] Database seeded with Phase 12 achievements catalog and secret `solutionConfig` for `CASE-001-MIDNIGHT-PROTOCOL`.
- [x] Progression & leveling mathematical utilities implemented in `src/modules/progression/utils/progression.util.ts`:
  - Formula: $\text{Level} = \lfloor 1 + \sqrt{\text{totalXP} / 100} \rfloor$.
  - Exact threshold calculations and rank title mappings across all operative clearance tiers.
- [x] Zod validation schemas implemented (`SaveSubmissionDraftSchema`, `FinalSubmissionSchema`).
- [x] Centralized submission guards implemented (`SubmissionGuard`) verifying investigation status, active participants, disbanded squad detection, Lead Investigator submission authority, case character validation, and declassified evidence access.
- [x] Server-only deterministic evaluation engine implemented (`EvaluationService`):
  - 6 dimensions: Primary Suspect (30 pts), Motive (15 pts), Method (15 pts), Timeline (15 pts), Supporting Evidence (15 pts), Contradicting Evidence (10 pts). Max 100 points.
  - Classification: `SOLVED_PERFECT` (>= 90 pts), `SOLVED_PARTIAL` (>= 60 pts), `INCORRECT` (< 60 pts).
  - Feedback dossiers with discrepancy analysis without secret answer leakage.
- [x] Idempotent reward service implemented (`RewardService`):
  - XP awards with unique `referenceKey` (`xp:case_solve:${investigationId}:${playerId}`) preventing duplicate awards.
  - Accolade unlocking system (`FIRST_CASE_SOLVED`, `PERFECT_INVESTIGATION`, `EVIDENCE_EXPERT`, `PUZZLE_SPECIALIST`, `TEAM_PLAYER`, `MASTER_DETECTIVE`, `CAMPAIGN_COMPLETED`).
- [x] REST API endpoints implemented:
  - `GET /api/investigations/[investigationId]/submissions`
  - `POST /api/investigations/[investigationId]/submissions`
  - `POST /api/investigations/[investigationId]/submissions/submit`
  - `GET /api/investigations/[investigationId]/results`
  - `GET /api/player/progression`
  - `GET /api/player/achievements`
- [x] Thematic operative UI components implemented:
  - `SubmissionForm`: Interactive multi-section case indictment builder.
  - `SubmissionReviewModal`: Pre-submission checklist & immutability warning confirmation.
  - `ResultsView`: Official judgment report dossier with dimensional score breakdown and forensic feedback.
  - `ProgressionView`: Operative progression dossier, XP progress bar, rank badges, and transaction ledger.
  - `AchievementsView`: Accolades catalog with unlocked statuses and reward badges.
- [x] Routes and workspace integration:
  - `/investigations/[investigationId]/submission`
  - `/investigations/[investigationId]/results`
  - `/profile/progression`
  - `/profile/achievements`
  - `/achievements`
  - Quick action links integrated into `WorkspaceHeader`, case investigation dashboard, and operative profile.
- [x] Comprehensive automated test suite created (`tests/submissions.test.ts` — 26 tests; 297 total tests passing across all 13 test files).
- [x] Architecture documentation authored (`docs/SUBMISSIONS_AND_REWARDS.md`).
- [x] Zero regressions across Phase 01–11 features; strict TypeScript compilation, linting, and Next.js production build verified.

---

## Phase 13: Admin Dashboard & Content Management System (CMS) — Acceptance Checklist

- [x] Database schema enhanced in `prisma/schema.prisma`:
  - `AdminUserRole`: join table linking `User` to `AdminRole`.
  - `SystemSetting`: platform configuration parameters and maintenance mode toggles.
  - `User`: added moderation columns `suspensionReason String?` and `suspendedAt DateTime?`.
- [x] Neon PostgreSQL migration deployed (`20261106183500_add_admin_user_roles_and_settings`). Total 10 migrations active in Neon.
- [x] Canonical permissions (37 actions) and default roles (`SUPER_ADMIN`, `CASE_AUTHOR`, `MODERATOR`) seeded in Neon (`prisma/seed.ts`).
- [x] Centralized server-side RBAC guard implemented (`AdminGuard`):
  - `requireAdmin`: enforces authentication, active user status, and admin role presence.
  - `requirePermission` & `requireAnyPermission`: granular permission checking with automatic SUPER_ADMIN satisfaction.
  - `assertNotDemotingLastSuperAdmin`: transactional protection preventing self-lockout or demotion of the last active SUPER_ADMIN.
- [x] Storyline CMS implemented (`AdminContentService`):
  - Campaigns: create, list, inspect, update, publish, archive.
  - Mystery Cases: create, list, inspect, update, publish, archive.
  - Protected Solution Config: `solutionConfig` management strictly segregated from ordinary `CASE_UPDATE` permission via `CASE_MANAGE_SOLUTION`.
  - Chapters, Suspects, Forensic Clues, and Interactive Puzzles authoring.
  - Puzzle answers and secret configuration updates strictly segregated via `PUZZLE_MANAGE_SECRET`.
- [x] Actionable Publication Validation (`validateCaseForPublication`):
  - Enforces chapters, suspects, clues, puzzle solution hashes, campaign state, and evaluation criteria before publishing.
  - Returns actionable validation error arrays (HTTP 422 `PUBLICATION_VALIDATION_FAILED`) on incomplete content.
- [x] Privilege Escalation Protection in Role Management:
  - Role creation, modification, and assignment restricted to permissions the acting administrator already possesses.
  - Appointing `SUPER_ADMIN` strictly restricted to existing Super Administrators.
- [x] Immutable Administrative Audit Ledger (`AdminAuditService`):
  - Mutations execute within atomic database transactions alongside audit records.
  - Automated recursive redaction of sensitive keys (`token`, `password`, `secretConfiguration`, `solutionHash`, `initData`, `cookie`).
  - Read-only historical ledger (`/api/admin/audit-logs`) with no update or delete APIs.
- [x] Super Administrator Bootstrap:
  - CLI one-time bootstrap script (`npm run admin:bootstrap <target>`).
  - API bootstrap route protected by secret and permanently locked once a SUPER_ADMIN exists (`BOOTSTRAP_PERMANENTLY_DISABLED`).
- [x] 33 REST API route handlers implemented under `src/app/api/admin/*`.
- [x] Responsive dark tactical command center frontend implemented under `src/app/(admin)/admin`:
  - Overview Dashboard, Operatives Directory, Operative Dossier, Campaigns CMS, Cases CMS, Case Blueprint Editor, Live Investigations Monitor, Accolades Catalog, XP Ledger & Adjustments, Telemetry & Analytics, Audit Log Inspector, Roles & RBAC Governance, System Settings.
- [x] Automated test suite created (`tests/admin.test.ts` — 18 tests; 315 total tests passing across all 14 test files).
- [x] Architecture documentation authored (`docs/ADMIN_DASHBOARD.md`).
- [x] Quality gates passed: Prisma validated (`npx prisma validate`), migrations verified (`npx prisma migrate status`), TypeScript strict mode (0 errors), all 315 tests passing, and Next.js Turbopack production build succeeded.

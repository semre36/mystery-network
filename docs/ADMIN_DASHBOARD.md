# MYSTERY NETWORK — ADMIN DASHBOARD & CONTENT MANAGEMENT SYSTEM (CMS)

**Specification & Operational Manual — Phase 13**

---

## 1. Architectural Overview

Phase 13 introduces an enterprise-grade, server-side Administrative Control Center and Content Management System (CMS) for MYSTERY NETWORK. Designed with a dark tactical detective aesthetic, it equips platform operators, scenario authors, and community moderators with real-time operational oversight, investigation monitoring, granular role-based access control (RBAC), and full storyline authoring capabilities.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 HQ COMMAND CONSOLE (/admin)                            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                ┌───────────────────────────┴───────────────────────────┐
                ▼                                                       ▼
  ┌───────────────────────────┐                           ┌───────────────────────────┐
  │   Administrative RBAC     │                           │      Storyline CMS        │
  │ • AdminGuard              │                           │ • Campaigns & Cases       │
  │ • Privilege Escalation    │                           │ • Chapters & Suspects     │
  │ • Last SuperAdmin Guard   │                           │ • Evidence Clues          │
  │ • Immutable Audit Logs    │                           │ • Puzzle Engine Minigames │
  └─────────────┬─────────────┘                           └─────────────┬─────────────┘
                │                                                       │
                ▼                                                       ▼
  ┌───────────────────────────┐                           ┌───────────────────────────┐
  │  Player Moderation & XP   │                           │ Protected Solution Matrix │
  │ • Suspend / Ban / Restore │                           │ • CASE_MANAGE_SOLUTION    │
  │ • Audited XP Ledger       │                           │ • PUZZLE_MANAGE_SECRET    │
  │ • Session Monitoring      │                           │ • Publication Validation  │
  └───────────────────────────┘                           └───────────────────────────┘
```

---

## 2. Granular Role-Based Access Control (RBAC)

All administrative access is enforced strictly server-side through `AdminGuard`. Client-side route protections and UI visibility toggles exist purely for user experience; no mutation or privileged query can execute without database-verified permission clearance.

### 2.1 Canonical Permissions Matrix (37 Permissions)

| Category       | Permission Action        | Description                                                             |
| :------------- | :----------------------- | :---------------------------------------------------------------------- |
| **Dashboard**  | `DASHBOARD_VIEW`         | Access `/admin` overview and live platform telemetry                    |
| **Analytics**  | `ANALYTICS_VIEW`         | Inspect engagement statistics, solve rates, and leaderboards            |
| **Operatives** | `USER_VIEW`              | Search and inspect player dossiers and investigation history            |
|                | `USER_UPDATE`            | Update operative parameters                                             |
|                | `USER_SUSPEND`           | Suspend operative accounts with mandatory justification                 |
|                | `USER_BAN`               | Permanently ban malicious actors with mandatory justification           |
| **RBAC**       | `ROLE_VIEW`              | Inspect role assignments and permission schemas                         |
|                | `ROLE_CREATE`            | Define new operational roles                                            |
|                | `ROLE_UPDATE`            | Modify role permissions and descriptions                                |
|                | `ROLE_ASSIGN`            | Assign or revoke roles on player accounts                               |
| **Campaigns**  | `CAMPAIGN_VIEW`          | Inspect published and draft campaigns                                   |
|                | `CAMPAIGN_CREATE`        | Author new campaign story arcs                                          |
|                | `CAMPAIGN_UPDATE`        | Edit campaign metadata and briefing                                     |
|                | `CAMPAIGN_PUBLISH`       | Publish or unpublish campaigns                                          |
|                | `CAMPAIGN_ARCHIVE`       | Archive completed campaigns                                             |
| **Case CMS**   | `CASE_VIEW`              | Inspect draft and published mystery scenarios                           |
|                | `CASE_CREATE`            | Author new mystery case scenarios                                       |
|                | `CASE_UPDATE`            | Edit case briefings, difficulty, duration, and metadata                 |
|                | `CASE_MANAGE_SOLUTION`   | **Protected**: Read/update canonical solution matrix (`solutionConfig`) |
|                | `CASE_PUBLISH`           | Publish cases to the operative network                                  |
|                | `CASE_ARCHIVE`           | Archive decommissioned cases                                            |
| **Chapters**   | `CHAPTER_MANAGE`         | Author, order, and configure case acts/chapters                         |
| **Characters** | `CHARACTER_MANAGE`       | Author fictional suspects and persons of interest                       |
| **Evidence**   | `EVIDENCE_VIEW`          | Inspect forensic evidence catalog                                       |
|                | `EVIDENCE_CREATE`        | Author new forensic clues                                               |
|                | `EVIDENCE_UPDATE`        | Edit clue types, descriptions, and distribution policies                |
|                | `EVIDENCE_DELETE`        | Decommission unassigned forensic clues                                  |
| **Puzzles**    | `PUZZLE_VIEW`            | Inspect interactive ciphers and puzzle configurations                   |
|                | `PUZZLE_CREATE`          | Author interactive ciphers and multi-stage challenges                   |
|                | `PUZZLE_UPDATE`          | Configure puzzle parameters and instructions                            |
|                | `PUZZLE_MANAGE_SECRET`   | **Protected**: Configure puzzle answers, secrets, and solution hashes   |
|                | `PUZZLE_DELETE`          | Delete puzzle challenges from chapters                                  |
| **Sessions**   | `INVESTIGATION_VIEW`     | Monitor live and completed investigation sessions                       |
|                | `INVESTIGATION_MANAGE`   | Transition investigation states and operational overrides               |
| **Rewards**    | `ACHIEVEMENT_MANAGE`     | Configure milestone accolades and criteria                              |
|                | `REWARD_MANAGE`          | Inspect XP ledger and commit audited manual XP adjustments              |
| **Governance** | `AUDIT_LOG_VIEW`         | Audit administrative action logs and security history                   |
|                | `SYSTEM_SETTINGS_MANAGE` | Configure platform runtime parameters and maintenance mode              |

### 2.2 Default Role Mappings

1. **`SUPER_ADMIN`**: Holds all 37 permissions. Has complete authority over platform governance, role assignment, and secret solution configuration.
2. **`CASE_AUTHOR`**: Designed for storyline architects. Grants authoring permissions for Campaigns, Cases, Chapters, Characters, Evidence, and Puzzles. **Excludes** `CASE_MANAGE_SOLUTION` and `PUZZLE_MANAGE_SECRET` by default.
3. **`MODERATOR`**: Designed for community managers. Grants permissions for player inspection, suspension, investigation monitoring, and audit log review.

---

## 3. Core Security & Integrity Safeguards

### 3.1 Separation of Content Editing from Secret Solution Keys

In compliance with strict security requirements:

- Holding `CASE_UPDATE` permits editing case briefings, difficulty, duration, and titles, but **never** grants access to the secret `solutionConfig`.
- Only callers possessing `CASE_MANAGE_SOLUTION` (or `SUPER_ADMIN`) can view or update `solutionConfig`.
- When non-authorized administrators call `GET /api/admin/cases/[caseId]`, `solutionConfig` is stripped from the returned DTO.
- Similarly, updating puzzle cleartext answers or secret configurations strictly requires `PUZZLE_MANAGE_SECRET`. Without this clearance, attempts to pass `rawSolution` or `secretConfiguration` are rejected with HTTP 403 `INSUFFICIENT_PERMISSIONS`.

### 3.2 Last Active SUPER_ADMIN Protection

To guarantee against accidental self-lockout or rogue administrative demotions:

- `AdminGuard.assertNotDemotingLastSuperAdmin` is executed transactionally whenever a `SUPER_ADMIN` role revocation, account suspension, or banning is attempted.
- If the target user is the sole remaining active `SUPER_ADMIN`, the transaction aborts with HTTP 400 `LAST_SUPER_ADMIN_PROTECTION`.

### 3.3 Privilege Escalation Guards in Role Assignment

- An administrator cannot assign the `SUPER_ADMIN` role unless they themselves are a `SUPER_ADMIN`.
- An administrator cannot create, update, or assign any role granting permissions that the acting administrator does not currently possess. Violations throw HTTP 403 `PRIVILEGE_ESCALATION_DENIED`.

### 3.4 Actionable Case Publication Validation

Before any mystery scenario can transition to `status = ContentStatus.PUBLISHED`, `AdminContentService.validateCaseForPublication` validates:

1. **Campaign Relationship**: Linked campaign must exist and not be in `ARCHIVED` status.
2. **Chapters**: At least one chapter must exist, with valid ordered sequence and non-empty titles/synopses.
3. **Suspects**: At least one character/suspect must be defined with narrative description.
4. **Evidence**: At least one forensic clue must be attached.
5. **Puzzles**: All attached puzzles (and their multi-stage steps) must have valid cryptographic solution hashes.
6. **Evaluation Config**: Valid `solutionConfig` specifying a primary culprit and motive keywords must be configured.

If any requirement is missing, publication is rejected with HTTP 422 `PUBLICATION_VALIDATION_FAILED` returning an actionable list of missing items.

### 3.5 Immutable Audit Ledger & Secret Redaction

- All mutations (suspensions, role grants, XP adjustments, setting changes) record an entry in `AdminAuditLog` within the same database transaction.
- `AdminAuditService.sanitizeMetadata` recursively redacts sensitive fields (`password`, `token`, `secretConfiguration`, `solutionHash`, `initData`, `cookie`) replacing them with `[REDACTED_SECRET]`.
- No update or delete APIs exist for `AdminAuditLog`, ensuring an immutable historical record.

---

## 4. Initial Super Administrator Bootstrap

Mystery Network incorporates a zero-hardcoded-credentials bootstrap mechanism:

### 4.1 Recommended: CLI Bootstrap Command

Operators can bootstrap the initial platform Super Administrator directly from the secure server terminal:

```bash
npm run admin:bootstrap <telegramId | userId | codename>
```

### 4.2 Protected API Bootstrap (Permanent Lockout)

If bootstrapping via the API endpoint (`POST /api/admin/bootstrap`):

1. The server must have `ADMIN_BOOTSTRAP_SECRET` configured in `.env`.
2. The caller must supply the matching secret via `x-bootstrap-secret` header or request body (verified via timing-safe comparison).
3. **Permanent Lockout**: Once ANY `SUPER_ADMIN` is registered in the database, the bootstrap procedure is **permanently disabled** (rejecting all subsequent requests with HTTP 409 `BOOTSTRAP_PERMANENTLY_DISABLED`).

---

## 5. REST API Route Catalog (`/api/admin/*`)

| Endpoint                             | Method  | Permission Required      | Description                                                 |
| :----------------------------------- | :------ | :----------------------- | :---------------------------------------------------------- |
| `/api/admin/dashboard`               | `GET`   | `DASHBOARD_VIEW`         | System health and live dashboard summary                    |
| `/api/admin/analytics`               | `GET`   | `ANALYTICS_VIEW`         | Aggregated telemetry, solve rates, and leaderboards         |
| `/api/admin/users`                   | `GET`   | `USER_VIEW`              | Paginated operative directory with status filters           |
| `/api/admin/users/[userId]`          | `GET`   | `USER_VIEW`              | Full operative dossier, sessions, and audit history         |
| `/api/admin/users/[userId]/suspend`  | `POST`  | `USER_SUSPEND`           | Suspend operative account (last super admin protected)      |
| `/api/admin/users/[userId]/ban`      | `POST`  | `USER_BAN`               | Permanently ban operative account                           |
| `/api/admin/users/[userId]/restore`  | `POST`  | `USER_UPDATE`            | Restore active status to suspended/banned operative         |
| `/api/admin/roles`                   | `GET`   | `ROLE_VIEW`              | List all system roles and permissions                       |
| `/api/admin/roles`                   | `POST`  | `ROLE_CREATE`            | Create a new custom role (escalation protected)             |
| `/api/admin/roles/[roleId]`          | `PATCH` | `ROLE_UPDATE`            | Update role permissions and metadata                        |
| `/api/admin/roles/[roleId]/assign`   | `POST`  | `ROLE_ASSIGN`            | Assign role to an operative (escalation protected)          |
| `/api/admin/roles/[roleId]/revoke`   | `POST`  | `ROLE_ASSIGN`            | Revoke role from an operative (last super admin protected)  |
| `/api/admin/permissions`             | `GET`   | `ROLE_VIEW`              | List all 37 canonical system permissions                    |
| `/api/admin/campaigns`               | `GET`   | `CAMPAIGN_VIEW`          | List all campaign story arcs                                |
| `/api/admin/campaigns`               | `POST`  | `CAMPAIGN_CREATE`        | Author a new campaign                                       |
| `/api/admin/campaigns/[campaignId]`  | `GET`   | `CAMPAIGN_VIEW`          | Retrieve campaign detail and scenario manifests             |
| `/api/admin/campaigns/[campaignId]`  | `PATCH` | `CAMPAIGN_UPDATE`        | Update campaign metadata and status                         |
| `/api/admin/cases`                   | `GET`   | `CASE_VIEW`              | List mystery cases with difficulty/status filters           |
| `/api/admin/cases`                   | `POST`  | `CASE_CREATE`            | Author a new mystery case draft                             |
| `/api/admin/cases/[caseId]`          | `GET`   | `CASE_VIEW`              | Retrieve case blueprint (scrubs secrets without clearance)  |
| `/api/admin/cases/[caseId]`          | `PATCH` | `CASE_UPDATE`            | Update case parameters (enforces publication validation)    |
| `/api/admin/cases/[caseId]/solution` | `GET`   | `CASE_MANAGE_SOLUTION`   | Retrieve protected case solution configuration              |
| `/api/admin/cases/[caseId]/solution` | `PUT`   | `CASE_MANAGE_SOLUTION`   | Update protected case solution configuration                |
| `/api/admin/chapters`                | `POST`  | `CHAPTER_MANAGE`         | Add a new chapter/act to a case                             |
| `/api/admin/chapters/[chapterId]`    | `PATCH` | `CHAPTER_MANAGE`         | Update chapter parameters                                   |
| `/api/admin/characters`              | `POST`  | `CHARACTER_MANAGE`       | Add a suspect/character to a case                           |
| `/api/admin/characters/[charId]`     | `PATCH` | `CHARACTER_MANAGE`       | Update character dossier                                    |
| `/api/admin/evidence`                | `POST`  | `EVIDENCE_CREATE`        | Author a new forensic evidence clue                         |
| `/api/admin/evidence/[clueId]`       | `PATCH` | `EVIDENCE_UPDATE`        | Update clue parameters and distribution policy              |
| `/api/admin/puzzles`                 | `POST`  | `PUZZLE_CREATE`          | Author interactive puzzle challenge                         |
| `/api/admin/puzzles/[puzzleId]`      | `GET`   | `PUZZLE_VIEW`            | Retrieve puzzle detail (secrets scrubbed without clearance) |
| `/api/admin/puzzles/[puzzleId]`      | `PATCH` | `PUZZLE_UPDATE`          | Update puzzle parameters (secrets require clearance)        |
| `/api/admin/investigations`          | `GET`   | `INVESTIGATION_VIEW`     | Paginated live investigation sessions monitor               |
| `/api/admin/investigations/[invId]`  | `GET`   | `INVESTIGATION_VIEW`     | Session telemetry and participant breakdown                 |
| `/api/admin/achievements`            | `GET`   | `ACHIEVEMENT_MANAGE`     | Accolade catalog and unlock counts                          |
| `/api/admin/achievements`            | `POST`  | `ACHIEVEMENT_MANAGE`     | Author a new platform milestone accolade                    |
| `/api/admin/rewards/transactions`    | `GET`   | `REWARD_MANAGE`          | XP block ledger audit history                               |
| `/api/admin/rewards/adjust-xp`       | `POST`  | `REWARD_MANAGE`          | Commit audited manual XP adjustment                         |
| `/api/admin/audit-logs`              | `GET`   | `AUDIT_LOG_VIEW`         | Append-only administrative audit ledger                     |
| `/api/admin/settings`                | `GET`   | `SYSTEM_SETTINGS_MANAGE` | Retrieve system runtime configuration                       |
| `/api/admin/settings`                | `PUT`   | `SYSTEM_SETTINGS_MANAGE` | Update system runtime parameter                             |
| `/api/admin/bootstrap`               | `POST`  | _Protected Secret_       | One-time bootstrap endpoint (permanently locked)            |

---

## 6. Frontend Administration Views

Located under `src/app/(admin)/admin`:

1. **Overview Dashboard** (`/admin`): Real-time KPI cards (active investigations, registered operatives, solve rates, active cases) and recent audit history feed.
2. **Operatives Management** (`/admin/users`): Searchable player directory with status badges, level/XP metrics, and suspension/banning/restoration modals.
3. **Operative Dossier** (`/admin/users/[userId]`): Deep investigation session history, unlocked accolades, and administrative action logs.
4. **Campaigns CMS** (`/admin/campaigns`): Story arc catalog with cover preview and status toggles.
5. **Cases CMS** (`/admin/cases`): Mystery scenario catalog with act/suspect/clue/puzzle counters.
6. **Case Scenario Editor** (`/admin/cases/[caseId]`): Multi-tab workspace for general parameters, acts, suspects, clues, puzzles, and the **Protected Solution Matrix**.
7. **Live Investigations Monitor** (`/admin/investigations`): Real-time session monitoring with status and play mode filters.
8. **Accolade Catalog** (`/admin/achievements`): Achievement authoring and unlock statistics.
9. **XP Ledger** (`/admin/rewards`): Complete transaction log and audited manual XP adjustments.
10. **Telemetry & Analytics** (`/admin/analytics`): Deep engagement metrics and popular case leaderboards.
11. **Audit Logs** (`/admin/audit-logs`): Expandable JSON metadata inspector for all administrative actions.
12. **Roles & RBAC** (`/admin/roles`): Role creation, permission inspection, and operative assignment.
13. **Settings** (`/admin/settings`): Runtime platform configuration and maintenance toggles.

---

## 7. Verification Results

- **Prisma Schema Validation**: Validated (`npx prisma validate`).
- **Database Migrations**: 10 active migrations deployed to Neon PostgreSQL (`npx prisma migrate status`).
- **Canonical Catalog Seeding**: 37 permissions, default roles, and benchmark settings seeded (`npx prisma db seed`).
- **Automated Tests**: 14 test suites, **315 tests passing** (`npm test`).
- **TypeScript Strict Mode**: 0 errors (`npm run typecheck`).
- **Production Build**: Successfully compiled and optimized via Next.js Turbopack (`npm run build`).

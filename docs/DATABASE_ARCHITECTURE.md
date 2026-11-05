# MYSTERY NETWORK — Database Architecture

## 1. Executive Database Overview

The MYSTERY NETWORK database is designed as a relational system targeting **Neon PostgreSQL** and accessed through **Prisma ORM**.

The platform is engineered to support an international player base collaborating in real-time or asynchronously to investigate episodic mysteries, decode forensic puzzles, share asymmetric evidence, and submit investigative indictments.

### Core Architectural Mandate: Content vs. Execution Separation

A foundational principle of the MYSTERY NETWORK database architecture is the strict separation between:

1. **Case Content Definitions** (Immutable narrative designs: `Campaign`, `Case`, `CaseChapter`, `CaseCharacter`, `Clue`, `Puzzle`).
2. **Investigation Executions** (Stateful, player/team-specific playthroughs: `Investigation`, `InvestigationParticipant`, `InvestigationProgress`, `ClueAssignment`, `EvidenceShare`, `PuzzleAttempt`, `CaseSubmission`).

Thousands of squads and solo players can concurrently investigate the identical case without ever contending for or overwriting shared state records.

---

## 2. Complete Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o| PlayerProfile : "has"
    User ||--o{ AdminAuditLog : "acts"

    PlayerProfile ||--o{ InvestigationParticipant : "participates"
    PlayerProfile ||--o{ ClueAssignment : "receives"
    PlayerProfile ||--o{ EvidenceShare : "shares"
    PlayerProfile ||--o{ EvidenceShare : "receives_share"
    PlayerProfile ||--o{ PuzzleAttempt : "attempts"
    PlayerProfile ||--o{ Team : "owns"
    PlayerProfile ||--o{ TeamMembership : "joins"
    PlayerProfile ||--o{ TeamInvitation : "creates"
    PlayerProfile ||--o{ CaseSubmission : "files"
    PlayerProfile ||--o{ XPTransaction : "earns"
    PlayerProfile ||--o{ UserAchievement : "unlocks"
    PlayerProfile ||--o{ Notification : "receives"

    Campaign ||--o{ Case : "groups"
    Case ||--o{ CaseChapter : "contains"
    Case ||--o{ CaseCharacter : "features"
    Case ||--o{ Clue : "provides"
    Case ||--o{ Puzzle : "challenges"
    Case ||--o{ Investigation : "instantiates"

    CaseChapter ||--o{ Clue : "scopes"
    CaseChapter ||--o{ Puzzle : "scopes"
    CaseChapter ||--o{ InvestigationProgress : "tracks"

    Investigation ||--o{ InvestigationParticipant : "enrolls"
    Investigation ||--o{ InvestigationProgress : "advances"
    Investigation ||--o{ ClueAssignment : "distributes"
    Investigation ||--o{ EvidenceShare : "contains"
    Investigation ||--o{ PuzzleAttempt : "records"
    Investigation ||--o{ CaseSubmission : "submits"
    Investigation ||--o{ XPTransaction : "rewards"
    Investigation }o--o| Team : "associated_with"

    Clue ||--o{ ClueAssignment : "assigned_via"
    Clue ||--o{ EvidenceAsset : "attaches"

    ClueAssignment ||--o{ EvidenceShare : "shared_in"

    Puzzle ||--o{ PuzzleAttempt : "attempted_via"

    Team ||--o{ TeamMembership : "comprises"
    Team ||--o{ TeamInvitation : "issues"

    CaseSubmission ||--o| SubmissionEvaluation : "evaluated_by"

    Achievement ||--o{ UserAchievement : "granted_to"

    AdminRole ||--o{ AdminRolePermission : "grants"
    AdminPermission ||--o{ AdminRolePermission : "assigned_to"
```

---

## 3. Database Domains & Responsibilities

### Domain A: Identity & Player Management

- **`User`**: Core authentication anchor. Stores `telegramId` as a native PostgreSQL `BIGINT` to prevent 64-bit integer precision loss in JavaScript runtimes.
- **`PlayerProfile`**: Public-facing investigator dossier. Stores codename (unique handle), display name, avatar URL, XP total, current rank/level, and UI preferences.

### Domain B: Campaign & Case Content

- **`Campaign`**: Multi-case overarching narrative arcs with unique URL slug and publication status.
- **`Case`**: Primary investigation template with unique `caseCode` (e.g. `CASE-001-MIDNIGHT-PROTOCOL`), difficulty, estimated duration, min/max player counts, and supported play modes (`SOLO`, `COOPERATIVE`).
- **`CaseChapter`**: Sequential episodic stages within a case with `chapterOrder` and unlocking prerequisites.
- **`CaseCharacter`**: Fictional personas, alibis, suspect statements, and narrative metadata.

### Domain C: Investigation Engine

- **`Investigation`**: Dedicated playthrough instance linking a player or squad to a specific `Case`.
- **`InvestigationParticipant`**: Enrolls players in an active investigation with join timestamps and status (`ACTIVE`, `INACTIVE`, `LEFT`).
- **`InvestigationProgress`**: Tracks chapter unlock and completion status per investigation.

### Domain D: Evidence & Clue Management

- **`Clue`**: Master clue definition with content, type (`DOCUMENT`, `AUDIO_LOG`, etc.), and strategy (`ASYMMETRIC_EXCLUSIVE`, `ROLE_BASED`, etc.).
- **`ClueAssignment`**: Concrete instance of a clue allocated to a player within an investigation.
- **`EvidenceShare`**: Audit log of clue sharing between squad members or to the entire investigation room.
- **`EvidenceAsset`**: Metadata for external storage objects (e.g. S3/Cloud Storage object key, mime type, byte size).

### Domain E: Puzzle System

- **`Puzzle`**: Minigame and cipher definition with configuration JSON and server-side `solutionHash`. Raw solutions are never stored in client-readable fields.
- **`PuzzleAttempt`**: Log of player answers and evaluation outcomes (`CORRECT`, `INCORRECT`, `PARTIAL`, `TIMEOUT`).

### Domain F: Team Collaboration

- **`Team`**: Persistent collaborative detective squad with unique invite code and owner.
- **`TeamMembership`**: Relates player to team with roles (`LEAD_INVESTIGATOR`, `DETECTIVE`, `SPECIALIST`).
- **`TeamInvitation`**: Time-limited invite codes for joining a team.

### Domain G: Submissions & Evaluation

- **`CaseSubmission`**: Player or team final case indictment payload (accused suspect, motive, attached evidence IDs).
- **`SubmissionEvaluation`**: Automated evaluation result (`SOLVED_PERFECT`, `SOLVED_PARTIAL`, etc.), score, and breakdown feedback.

### Domain H: Player Progression

- **`XPTransaction`**: Auditable append-only ledger of XP events preventing duplicate awards.
- **`Achievement`**: Defined accolades with unlock criteria configuration.
- **`UserAchievement`**: Unlocked badges per player with timestamp.

### Domain I: Notifications

- **`Notification`**: Queue of in-app and Telegram push notifications with read receipts.

### Domain J: Administration & Audit

- **`AdminRole`**, **`AdminPermission`**, **`AdminRolePermission`**: Granular role-based access control (RBAC).
- **`AdminAuditLog`**: Append-only log recording administrative mutations with JSON metadata.

---

## 4. Key Relationships, Constraints, and Deletion Strategy

| Relation                                       | Foreign Key                         | Deletion Policy | Architectural Rationale                                                                                |
| :--------------------------------------------- | :---------------------------------- | :-------------- | :----------------------------------------------------------------------------------------------------- |
| `User` &rarr; `PlayerProfile`                  | `PlayerProfile.userId`              | `CASCADE`       | Deleting a user account cleans up the profile.                                                         |
| `Case` &rarr; `Investigation`                  | `Investigation.caseId`              | `RESTRICT`      | Case content cannot be deleted if active or historical investigations exist. Prevents data corruption. |
| `Case` &rarr; `CaseChapter`                    | `CaseChapter.caseId`                | `CASCADE`       | Case chapters belong exclusively to their parent case.                                                 |
| `Investigation` &rarr; `ClueAssignment`        | `ClueAssignment.investigationId`    | `CASCADE`       | Deleting an aborted investigation cleans up active temporary assignments.                              |
| `PlayerProfile` &rarr; `ClueAssignment`        | `ClueAssignment.playerId`           | `RESTRICT`      | Player history cannot be silently dropped.                                                             |
| `CaseSubmission` &rarr; `SubmissionEvaluation` | `SubmissionEvaluation.submissionId` | `CASCADE`       | Evaluations depend 1:1 on the submission record.                                                       |
| `PlayerProfile` &rarr; `XPTransaction`         | `XPTransaction.playerId`            | `RESTRICT`      | Financial/progression ledger records must never be cascaded.                                           |

---

## 5. Index Strategy & High-Volume Query Patterns

Indexes are intentionally placed to accelerate frequent access patterns without bloating write overhead:

1. **Player Lookup by Telegram ID**:
   - `User.telegramId` (Unique B-tree index). Instant lookup during Telegram Mini App initialization.
2. **Leaderboards & Player Profiles**:
   - `PlayerProfile.xp(sort: Desc)` for global and seasonal rank retrieval.
   - `PlayerProfile.codename` (Unique) for dossier lookups.
3. **Published Case Catalog**:
   - `Case.status` + `Case.difficulty` + `Case.caseCode` for catalog filtering.
4. **Active Player Investigations**:
   - `InvestigationParticipant.playerId` + `InvestigationParticipant.status` for loading ongoing games.
5. **Asymmetric Clue Access & Permissions**:
   - `ClueAssignment [investigationId, playerId]` composite index for sub-millisecond evidence retrieval.
6. **Chronological Ledger Queries**:
   - `XPTransaction [playerId, createdAt(sort: Desc)]` for fast transaction history rendering without full-table sorting.
7. **Unread Notifications**:
   - `Notification [playerId, isRead, createdAt(sort: Desc)]` composite index for fast badge counter queries.

---

## 6. Security Boundaries & Private Evidence Protection

- **Server-Only Access**: The Prisma client is located in `src/server/infrastructure/database/index.ts` and must never be imported into React Client Components.
- **Asymmetric Clue Leak Prevention**:
  - The database requires explicit `ClueAssignment` or `EvidenceShare` records to authorize clue reading.
  - Client queries must query through domain services verifying that `investigationParticipant.playerId === session.playerId`.
- **Hashed Puzzle Solutions**:
  - `Puzzle.solutionHash` stores cryptographic digests (e.g. SHA-256). Answers are submitted to the server and evaluated server-side.
- **Telegram Precision**:
  - `telegramId` is typed as PostgreSQL `BIGINT`, avoiding 53-bit JavaScript floating-point truncation.

---

## 7. Neon Connection Strategy

Neon provides serverless PostgreSQL with auto-scaling compute and connection pooling:

```mermaid
flowchart LR
    subgraph NextApp["Next.js App Runtime"]
        CLIENT["PrismaClient Singleton"]
    end

    subgraph Neon["Neon Infrastructure"]
        PGBOUNCER["Neon PgBouncer Pooler (Port 6543)"]
        DIRECT_PG["PostgreSQL Direct Compute (Port 5432)"]
    end

    CLIENT -- "Runtime Queries (DATABASE_URL)" --> PGBOUNCER
    MIGRATIONS["Prisma CLI Migrations (DIRECT_URL)"] -- "DDL & Migrations" --> DIRECT_PG
```

- **Runtime Queries (`DATABASE_URL`)**: Connects to Neon's PgBouncer pooler (`-pooler.neon.tech:6543`). Handles high-concurrency serverless function requests without exhausting PostgreSQL connection limits.
- **Prisma Migrations (`DIRECT_URL`)**: Connects directly to the compute instance (`.neon.tech:5432`). Required for Prisma migrate commands because connection poolers do not support transaction-level DDL locks.

---

## 8. Migration & Seed Workflow

### When Neon Credentials Are Configured:

1. Configure credentials in `.env.local` or `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@ep-cool-app-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
   DIRECT_URL="postgresql://user:password@ep-cool-app.eu-central-1.aws.neon.tech/neondb?sslmode=require"
   ```
2. Generate Prisma Client:
   ```bash
   npm run db:generate
   ```
3. Run migrations:
   ```bash
   npm run db:migrate -- --name init_mystery_network
   ```
4. Seed development data:
   ```bash
   npm run db:seed
   ```

---

## 9. Known Limitations

- Real-time investigation board websocket synchronization (Phase 11) will require Redis Pub/Sub or Neon Logical Replication in later phases.
- Binary asset storage (audio files, evidence scans) relies on metadata references; actual S3/R2 presigned upload workflows belong in Phase 08.

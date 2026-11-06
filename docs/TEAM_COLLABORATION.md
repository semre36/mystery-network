# TEAM COLLABORATION & MULTIPLAYER INVESTIGATION SYSTEM

## 1. ARCHITECTURAL OVERVIEW

The Team Collaboration & Multiplayer Investigation System (Phase 09) introduces multi-investigator squad coordination, cryptographically secure invitation tokens, decentralized clue sharing, and synchronized investigation participation into the MYSTERY NETWORK intelligence platform.

### Core Architecture Pillars

1. **Persistent Squad Hierarchy**:
   - `Team`: Represents an operative tactical unit identified by a collision-resistant callsign code (e.g. `SQ-XXXX-XXXX`).
   - `TeamRole`: Strict hierarchical roles (`LEAD_INVESTIGATOR`, `DETECTIVE`, `SPECIALIST`).
   - Squad ownership and command are explicitly guarded; Lead Investigators possess exclusive authority to commission invitations, transfer leadership, and dismiss operatives.
   - Squad members can voluntarily depart at any time, with an automatic disbanding protocol if the unit becomes completely unoccupied.

2. **Cryptographically Secure Invitation Pipeline**:
   - Invitation links use high-entropy random tokens (256-bit entropy / 32 bytes hex).
   - The server hashes raw tokens via SHA-256 before persisting in `TeamInvitation.invitationCode`. The raw token is **never** stored in the database or written to server audit logs.
   - Public preview endpoint (`/api/invitations/[token]`) provides sanitized metadata (unit name, squad leader, operative count, expiration) without exposing internal identifiers, token hashes, or full squad rosters.
   - Atomic acceptance protocol prevents replay attacks, token re-use, and duplicate active memberships.
   - Expired or revoked invitations return HTTP 410 (Gone).

3. **Multiplayer Investigation Coordination**:
   - Investigations support both `SOLO` and `COOPERATIVE` play modes.
   - Squad investigations are initiated with `teamId` and set to `PlayMode.COOPERATIVE`.
   - All active squad operatives (or selected operatives) are registered in `InvestigationParticipant`.
   - Concurrency locking with PostgreSQL advisory transaction locks ensures simultaneous start requests resolve to the identical active session without duplicating investigations.
   - When a squad member joins an ongoing investigation:
     - Their `InvestigationParticipant` record is activated.
     - Eligible `ALL_PLAYERS` clues for the current unlocked chapter are provisioned.
     - `ASYMMETRIC_EXCLUSIVE` clues already assigned to another operative remain untouched and are **never** transferred or duplicated.
     - Private notes remain strictly isolated per player.

---

## 2. DATABASE SCHEMA EXTENSIONS

The live Neon PostgreSQL database was migrated via migration:
`prisma/migrations/20261106131500_add_team_collaboration_and_invitation_enhancements`

### Key Schema Additions

```prisma
enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
  REVOKED
}

model Team {
  id          String        @id @default(uuid()) @db.Uuid
  name        String
  description String?       @db.Text
  avatarUrl   String?
  inviteCode  String        @unique
  ownerId     String        @db.Uuid
  owner       PlayerProfile @relation("TeamOwner", fields: [ownerId], references: [id], onDelete: Restrict)
  status      TeamStatus    @default(ACTIVE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  members        TeamMembership[]
  invitations    TeamInvitation[]
  investigations Investigation[]
}

model TeamInvitation {
  id              String           @id @default(uuid()) @db.Uuid
  teamId          String           @db.Uuid
  team            Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  invitationCode  String           @unique // Stores SHA-256 hash of raw token
  createdById     String           @db.Uuid
  createdBy       PlayerProfile    @relation("InvitationCreator", fields: [createdById], references: [id], onDelete: Restrict)
  invitedPlayerId String?          @db.Uuid
  invitedPlayer   PlayerProfile?   @relation("DirectInvitations", fields: [invitedPlayerId], references: [id], onDelete: SetNull)
  expiresAt       DateTime
  status          InvitationStatus @default(PENDING)
  acceptedAt      DateTime?
  revokedAt       DateTime?
  createdAt       DateTime         @default(now())

  @@index([invitationCode])
  @@index([teamId])
  @@index([invitedPlayerId])
  @@index([status])
  @@index([expiresAt])
  @@map("team_invitations")
}
```

---

## 3. API SPECIFICATION

All endpoints enforce strict server-side session authentication via `requireAuthenticatedUser`, except the public preview endpoint (`GET /api/invitations/[token]`).

| Endpoint                                         | Method   | Access              | Description                                               |
| ------------------------------------------------ | -------- | ------------------- | --------------------------------------------------------- |
| `/api/teams`                                     | `GET`    | Authenticated       | Retrieve all squads the caller belongs to                 |
| `/api/teams`                                     | `POST`   | Authenticated       | Commission a new squad (caller becomes Lead Investigator) |
| `/api/teams/[teamId]`                            | `GET`    | Squad Member        | Retrieve squad dossier, roster, and active investigations |
| `/api/teams/[teamId]`                            | `PATCH`  | Squad Leader        | Update squad metadata (name, description, insignia)       |
| `/api/teams/[teamId]/members`                    | `GET`    | Squad Member        | Retrieve active operative roster                          |
| `/api/teams/[teamId]/members/me`                 | `DELETE` | Squad Member        | Voluntarily leave squad (disbands if empty)               |
| `/api/teams/[teamId]/members/[userId]`           | `DELETE` | Squad Leader        | Remove an operative from squad roster                     |
| `/api/teams/[teamId]/transfer-leadership`        | `POST`   | Squad Leader        | Transfer Lead Investigator role to another member         |
| `/api/teams/[teamId]/invitations`                | `GET`    | Squad Leader        | List dispatched squad invitation tokens                   |
| `/api/teams/[teamId]/invitations`                | `POST`   | Squad Leader        | Generate cryptographically secure invite token            |
| `/api/teams/[teamId]/invitations/[invitationId]` | `DELETE` | Squad Leader        | Revoke pending invitation token                           |
| `/api/invitations/[token]`                       | `GET`    | Public              | Preview squad invitation details safely                   |
| `/api/invitations/[token]/accept`                | `POST`   | Authenticated       | Accept squad invitation & enroll as Detective             |
| `/api/invitations/[token]/decline`               | `POST`   | Authenticated       | Decline squad invitation                                  |
| `/api/investigations/[investigationId]/join`     | `POST`   | Squad Member        | Join ongoing squad investigation session                  |
| `/api/investigations`                            | `POST`   | Squad Leader / Solo | Start/resume solo or squad investigation (`teamId`)       |

---

## 4. SECURITY & INTEGRITY MEASURES

1. **Existence Probing Protection**:
   - `TeamGuard.requireTeamMember` throws uniform HTTP 404 for nonexistent squads or squads where the caller is not an active member. Non-members cannot determine if a private squad ID exists.

2. **Replay & Concurrency Prevention**:
   - Invitation acceptance runs in interactive serializable transactions protected by PostgreSQL advisory transaction locks (`pg_advisory_xact_lock(hashtext(tokenHash))`).
   - Tokens transition from `PENDING` to `ACCEPTED` using atomic conditional updates (`updateMany` checking `status: PENDING, expiresAt > now()`), preventing race conditions.
   - Already used, expired, declined, or revoked tokens return HTTP 410 (Gone).

3. **Asymmetric Evidence Isolation & Provisioning Locks**:
   - In cooperative squad investigations, `EvidenceService.provisionInvestigationClues` acquires a transactional advisory lock (`pg_advisory_xact_lock(hashtext(investigationId))`) to strictly serialize concurrent operative joins and chapter clue provisioning.
   - `ASYMMETRIC_EXCLUSIVE` clues assigned to an operative are **never** reassigned, duplicated, or leaked to other team members joining concurrently or later.
   - Private field notes (`EvidenceNote`) are strictly scoped by `(investigationId, clueId, playerId)` and remain confidential to the authoring operative.

4. **Sanitized Public Previews**:
   - The preview route (`/api/invitations/[token]`) exposes only high-level unit information: name, description, insignia, leader codename, and member count.
   - Token hashes, internal player IDs, and case progress remain confidential.

---

## 5. MEMBERSHIP LIFECYCLE & INVESTIGATION ACCESS POLICY

### Operative Removal Policy

- When a squad leader removes a member (`removeTeamMember`):
  1. The member's squad membership status is set to `MembershipStatus.REMOVED`.
  2. In an atomic transaction, the operative's active participant records (`InvestigationParticipant`) for all **ongoing** squad investigations (`NOT_STARTED`, `IN_PROGRESS`, `PAUSED`) are transitioned to `ParticipantStatus.LEFT`.
  3. The removed operative is immediately blocked from the squad dossier, active investigation workspaces, evidence queries, and notes creation (uniform HTTP 404).
  4. Historical investigations (`SOLVED`, `FAILED`, `ABANDONED`) remain intact: historical participant records and clue assignments are preserved for retrospective auditability and dossier records.

### Voluntary Departure Policy

- When an operative voluntarily departs (`leaveTeam`):
  1. The leader cannot depart without transferring command if other squad members exist.
  2. The member's squad membership status is set to `MembershipStatus.LEFT`.
  3. Active participation in ongoing squad investigations (`NOT_STARTED`, `IN_PROGRESS`, `PAUSED`) is atomically transitioned to `ParticipantStatus.LEFT`.
  4. If the departed member was the last operative in the squad, the unit triggers the **Automatic Disband Protocol**.

### Automatic Disbanding Protocol

- When a squad becomes empty:
  1. Squad status transitions to `TeamStatus.DISBANDED`.
  2. All ongoing investigations (`NOT_STARTED`, `IN_PROGRESS`, `PAUSED`) are atomically transitioned to `InvestigationStatus.ABANDONED` with `completedAt = new Date()`.
  3. Disbanded squads are permanently barred from starting new investigations (`TEAM_NOT_FOUND` / 404), generating invitation tokens, or accepting new operatives (`TEAM_DISBANDED` / 400).

### Historical Record Preservation

- Completed investigations (`SOLVED`, `FAILED`, `ABANDONED`) are immutable historical records.
- Past participants retain retrospective read-only access to view the completed investigation dossier of cases they helped solve, even if their squad membership later ends.
- Previously created field notes (`EvidenceNote`) and evidence transmissions (`EvidenceShare`) remain preserved in the audit log.

### Leadership Succession & Transfer Rules

- Squad leadership is atomic: exactly one active member holds the `LEAD_INVESTIGATOR` role.
- `transferTeamLeadership` demotes the current leader to `DETECTIVE`, promotes the designated active operative to `LEAD_INVESTIGATOR`, and updates `team.ownerId` within a single database transaction.
- Non-members or removed operatives cannot be promoted.

### Invitation Concurrency & Rejection Protocols

- **Atomic Acceptance**: Serialized via advisory transaction lock and conditional update. Simultaneous duplicate requests on a single-use token result in exactly one acceptance; the second request receives HTTP 410 `INVITATION_ALREADY_USED`.
- **Declined Invitations**: Accepting a previously declined invitation returns HTTP 410 `INVITATION_DECLINED`.
- **Open Link vs Personal Invites**: When an operative declines an open link invitation (`invitedPlayerId === null`), the operation acknowledges locally without mutating the shared token, preserving the link for other operatives. Targeted personal invitations (`invitedPlayerId === callerId`) transition the database status to `DECLINED`.
- **Revocation Protection**: Revoking an invitation that has already been accepted is rejected with HTTP 400 `INVITATION_ALREADY_ACCEPTED`.

### Cooperative Participant Enrollment Policy

- When starting an investigation, the Lead Investigator can enroll all active squad members or select a tactical subset.
- Any active squad member not initially enrolled can deploy into the investigation at any time via `joinTeamInvestigation`.
- Late-joining operatives receive eligible `ALL_PLAYERS` clues for current unlocked chapters. `ASYMMETRIC_EXCLUSIVE` clues remain assigned to their original recipients.
- Removed or non-squad members cannot join active squad investigations (HTTP 403 / 404). Concluded investigations reject new participant enrollments (HTTP 400 `INVESTIGATION_CONCLUDED`).

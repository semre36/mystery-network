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
   - Invitation acceptance runs in interactive serializable transactions.
   - Tokens can only transition from `PENDING` to `ACCEPTED` once.
   - Expired tokens or revoked tokens are rejected immediately.

3. **Asymmetric Evidence Isolation**:
   - In cooperative squad investigations, `ASYMMETRIC_EXCLUSIVE` clues already assigned to an operative are **never** reassigned, duplicated, or leaked to other team members joining late.
   - Private field notes (`EvidenceNote`) remain strictly private to the authoring operative.

4. **Sanitized Public Previews**:
   - The preview route (`/api/invitations/[token]`) exposes only high-level unit information: name, description, insignia, leader codename, and member count.
   - Token hashes, internal player IDs, and case progress remain confidential.

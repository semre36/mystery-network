# MYSTERY NETWORK — Security Standards

## 1. Secret Management

- **Zero Secrets in Source Code**: No API keys, passwords, database URLs, or signing secrets may ever be committed to git.
- **Environment Separation**:
  - `.env.example` provides the documented template without real credentials.
  - `.env.local` contains machine-local secrets and is strictly ignored in `.gitignore`.
- **Public vs. Private Variables**: Only variables explicitly prefixed with `NEXT_PUBLIC_` are exposed to the client bundle. All credentials, database connection strings, and bot tokens must remain un-prefixed and server-only.
- **Telegram Token Protection**: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` are strictly confidential server-side secrets. They must never be printed to application logs or returned in error payloads.
- **Webhook Constant-Time Comparison**: Incoming `X-Telegram-Bot-Api-Secret-Token` headers are verified using `crypto.timingSafeEqual` to prevent timing attacks. Requests failing secret verification are rejected immediately with HTTP 401.

---

## 2. Server / Client Boundaries

- Sensitive computational logic (puzzle solutions, secret truth tables, clue assignment seeds) must reside strictly on the server.
- Files handling cryptography or direct database interactions must be isolated from client component imports.
- Never pass unmasked internal database IDs or sensitive user attributes directly to the client when a public DTO suffices.

---

## 3. Authentication Principles

- **Telegram WebApp Cryptographic Validation**:
  - In Phase 04, player identity will be verified by computing the HMAC-SHA256 signature of Telegram's `initData` using the bot token as the secret key.
  - The `auth_date` parameter must be checked to prevent replay attacks (maximum allowed age: 24 hours).
  - Unsigned or unverified client headers will be rejected with HTTP 401 Unauthorized.
- **Session Tokens**:
  - Session tokens issued to clients will use cryptographically signed JWTs or secure httpOnly cookies.

---

## 4. Authorization & Access Control

- **Principle of Least Privilege**: Every API endpoint and server action must verify whether the authenticated investigator has permission to perform the requested operation.
- **Resource Ownership**:
  - A player can only access their assigned clues and squad cases.
  - Team actions (e.g., submitting final case indictment) must check the player's team role (Squad Lead / Detective).
- **Administrative Endpoints**:
  - Admin endpoints (`/api/admin/*`) require explicit administrative claims verified against the database session, not client-supplied role flags.

---

## 5. Input Validation & Sanitization

- **Perimeter Defense**: All external inputs (request bodies, query parameters, route params) must be validated with Zod schemas.
- **SQL / Injection Defense**: All database queries use parameterized queries via Prisma ORM; raw SQL strings are strictly prohibited.
- **Solution Concealment**: Puzzle solutions are stored exclusively as cryptographic hashes (`Puzzle.solutionHash`). Raw answers must never be persisted or queried into client bundles.
- **Database Credential Protection**: Both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) are server-only environment variables and must never be prefixed with `NEXT_PUBLIC_`.
- **XSS Prevention**: User-generated content (e.g., detective notes, squad chat messages) must be sanitized before rendering.

---

## 6. Rate Limiting Principles

- **DDoS & Brute-Force Protection**: Rate limits must protect endpoints susceptible to abuse:
  - Authentication and login endpoints.
  - Puzzle verification attempts (preventing automated brute-forcing of cipher codes).
  - Public health checks and landing pages.
- **Implementation (Phase 02+)**: Rate limiting will be enforced via Upstash Redis or memory-bounded token bucket algorithms.

---

## 7. Protection of Private Evidence

- **Asymmetric Integrity**: Clues assigned to Investigator A must not be fetchable by Investigator B through ID tampering (IDOR protection).
- **Redaction & Concealment**:
  - Clue solutions and hidden metadata must never be transmitted in API payloads before being officially unlocked in the player's investigation session.
  - Structured logs automatically scrub fields containing keys matching `token`, `password`, `secret`, `authorization`, and `evidence`.

---

## 8. Telegram Mini App Authentication & Session Security (Phase 04)

- **Zero Client Trust**:
  - Raw `Telegram.WebApp.initData` is validated strictly on the server using HMAC-SHA256 derived from `TELEGRAM_BOT_TOKEN`.
  - Client-supplied identity, username, or IDs are never trusted directly.
- **Freshness & Replay Mitigation**:
  - `auth_date` must not exceed 300 seconds (5 minutes) in age (`INIT_DATA_MAX_AGE_SECONDS`).
  - `auth_date` is validated with a 10-second forward clock-skew tolerance (`MAX_CLOCK_SKEW_SECONDS`) to reject future timestamp spoofing.
- **Server-Side Session Management**:
  - Sessions are generated with 256 bits of cryptographically secure entropy (`crypto.randomBytes(32)`).
  - Only SHA-256 digests (`tokenHash`) are stored in the PostgreSQL `AuthSession` table.
  - Raw session tokens are never persisted in the database or emitted in server logs.
- **Hardened Cookie Transport**:
  - Session cookies (`mn_session`) are marked `HttpOnly` and scoped to `Path=/`.
  - In production, cookies enforce `SameSite=None; Secure` to ensure persistent cookie propagation within Telegram Web's `<iframe>` and mobile WebViews.
- **Constant-Time Verification**:
  - Token digest comparisons utilize `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

---

## 9. Investigation Session Authorization & OPSEC (Phase 07)

- **Participant Authorization Verification**:
  - Every investigation endpoint enforces participant membership verification on the server.
  - Guessing an investigation UUID returns HTTP 404 (`INVESTIGATION_NOT_FOUND`) rather than 403, preventing unauthorized UUID existence enumeration.
- **State Machine Integrity**:
  - Direct status modification is strictly disallowed. Only valid transitions (`PAUSE`, `RESUME`, `ABANDON`, `COMPLETE`) validated by server-side guards are permitted.
  - Concluded investigations (`SOLVED`) and `ABANDONED` investigations remain permanently immutable.
- **Progression Enclosure**:
  - Players can only progress chapters sequentially (`chapterOrder + 1`).
  - Attempting to unlock or progress a locked chapter is rejected with HTTP 400 (`CHAPTER_LOCKED`).
- **Concurrency & Duplicate Guard**:
  - Concurrency-safe interactive database transactions prevent race conditions and duplicate session generation on duplicate client requests.

---

## 10. Evidence System & Clue Distribution Security (Phase 08)

- **Anti-IDOR & Existence Enumeration Prevention**:
  - Requesting a clue that does not belong to the active investigation, or an asymmetric clue assigned to another operative that has not been shared, or guessing an evidence UUID returns uniform HTTP 404 (`EVIDENCE_NOT_FOUND`).
  - No differences in error codes, timing signatures, or response structures leak clue existence.
- **Chapter Lock Enforcement**:
  - Clues associated with locked chapters cannot be discovered, assigned, or inspected. The server filters out clues belonging to uncompleted preceding chapters.
- **Asymmetric Intelligence Confidentiality**:
  - Private evidence (`ASYMMETRIC_EXCLUSIVE`) is strictly visible only to the assigned investigator until transmitted via an explicit `EvidenceShare` record.
- **Strict Peer-to-Peer Sharing Scoping**:
  - Evidence sharing verifies both sender and recipient belong to the **exact same** investigation. Sharing with external players, inactive operatives, or oneself is strictly blocked.
  - Active shares are idempotent; duplicate sharing requests are rejected.
- **Private Notes Isolation**:
  - Field notes (`EvidenceNote`) are keyed on `(investigationId, clueId, playerId)`. Queries strictly bind the authenticated operative's ID. Teammates cannot inspect each other's deductions.
- **Asset Storage & Traversal Hardening (`StorageService`)**:
  - All file uploads and streaming keys are validated against a strict MIME whitelist (`image/jpeg`, `image/png`, `image/webp`, `audio/mpeg`, `audio/wav`, `audio/ogg`, `application/pdf`, `text/plain`).
  - A strict 10 MB (`10,485,760 bytes`) file size limit is enforced.
  - Storage keys are cryptographically generated UUIDs. File names are stripped of path components to prevent directory traversal (`../`) attacks.
  - No raw cloud storage keys, S3 credentials, or internal bucket names are exposed to clients.

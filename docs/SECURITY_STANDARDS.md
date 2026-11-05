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

# MYSTERY NETWORK

> **"Every player knows something. Nobody knows everything."**

MYSTERY NETWORK is a global collaborative detective investigation platform delivered initially through a Telegram Mini App.

This repository is built as a **Modular Monolith** using Next.js App Router, React, Tailwind CSS, TypeScript, and Vitest.

---

## Getting Started

### Prerequisites

- Node.js `^20.0.0` or `^24.0.0`
- npm `^10.0.0` or `^12.0.0`

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Development Scripts

```bash
# Start Next.js development server
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Run unit and integration tests
npm run test

# Run ESLint
npm run lint

# Check code formatting
npm run format:check

# Auto-format codebase
npm run format

# Build for production
npm run build

# Start production server
npm run start

# Database Management (Prisma)
npm run db:validate   # Validate Prisma schema
npm run db:generate   # Generate Prisma client
npm run db:seed       # Run idempotent development seed
npm run db:migrate    # Run migrations in development (requires DIRECT_URL)
npm run db:deploy     # Deploy migrations in production (requires DIRECT_URL)

# Telegram Bot Management
npm run telegram:info         # Inspect active Telegram webhook status
npm run telegram:set-commands # Register official Telegram bot command menu
npm run telegram:set-webhook  # Register webhook URL with secret token
npm run telegram:delete-webhook # Remove active webhook registration
```

---

## Architectural Documentation

Full architectural specifications, security rules, and roadmaps are located in the [`docs/`](./docs) directory:

- [Product Overview](./docs/PRODUCT_OVERVIEW.md)
- [Architecture & Modular Monolith Design](./docs/ARCHITECTURE.md)
- [Database Architecture & Data Models](./docs/DATABASE_ARCHITECTURE.md)
- [Telegram Bot Architecture & Guide](./docs/TELEGRAM_BOT.md)
- [Telegram Mini App Authentication & Sessions](./docs/TELEGRAM_AUTHENTICATION.md)
- [Player Interface & Investigator Dossier](./docs/PLAYER_INTERFACE.md)
- [Case Management & Discovery System](./docs/CASE_MANAGEMENT.md)
- [Investigation Engine & Session Management](./docs/INVESTIGATION_ENGINE.md)
- [Evidence System & Clue Distribution](./docs/EVIDENCE_SYSTEM.md)
- [Team Collaboration & Multiplayer Investigation](./docs/TEAM_COLLABORATION.md)
- [Development Guidelines](./docs/DEVELOPMENT_GUIDELINES.md)
- [Security Standards](./docs/SECURITY_STANDARDS.md)
- [Project Structure & Directory Map](./docs/PROJECT_STRUCTURE.md)
- [Development Roadmap](./docs/DEVELOPMENT_ROADMAP.md)

---

## Verification & Status

- **Phase 01: Project Foundation** — Completed.
- **Phase 02: Database Architecture & Prisma** — Completed.
- **Phase 03: Telegram Bot Integration** — Completed (Bot, Commands, Webhook Route & Tests Verified).
- **Phase 04: Telegram Mini App Authentication** — Completed (HMAC-SHA256 InitData Verification, AuthSession Management, Transactional Provisioning, HTTP-Only Cookies).
- **Phase 05: Player Interface & Investigator Dossier** — Completed (Central Intelligence Console, Responsive AppShell, Dossier Management, Progression Tracking, Real Metrics).
- **Phase 06: Case Management & Discovery System** — Completed (Case Archive, Classified Dossier Briefing, Campaign Directory, Threat Classification, Public API Redaction).
- **Phase 07: Investigation Engine & Session Management** — Completed (Lifecycle State Machine, Atomic Session Creation & Reuse, Chapter Progression Engine, Workspace UI, Session History).
- **Phase 08: Evidence System & Clue Distribution** — Completed (Persistent Evidence Vault, Asymmetric Clue Distribution, Private Notes Isolation, Peer-to-Peer Sharing, Storage Abstraction, Anti-IDOR Authorization).
- **Phase 09: Team Collaboration & Multiplayer Investigation** — Completed (Squad Roster Management, Cryptographic 256-bit Invitation Pipeline, Cooperative Investigations, Clue Synchronization, Leader Role Guards).
- Health Endpoint: `GET /api/health`
- Telegram Webhook: `POST /api/telegram/webhook`
- Auth Endpoints: `POST /api/auth/telegram`, `GET /api/auth/session`, `POST /api/auth/logout`
- Player Endpoints: `GET /api/player/me`, `PATCH /api/player/profile`
- Case & Campaign Endpoints: `GET /api/cases`, `GET /api/cases/[caseId]`, `GET /api/campaigns`, `GET /api/campaigns/[slug]`
- Investigation Endpoints: `POST /api/investigations`, `GET /api/investigations`, `GET /api/investigations/[investigationId]`, `PATCH /api/investigations/[investigationId]/status`, `GET /api/investigations/[investigationId]/progress`, `PATCH /api/investigations/[investigationId]/progress`, `POST /api/investigations/[investigationId]/join`
- Evidence Endpoints: `GET /api/investigations/[investigationId]/evidence`, `GET /api/investigations/[investigationId]/evidence/[evidenceId]`, `POST /api/investigations/[investigationId]/evidence/[evidenceId]/notes`, `POST /api/investigations/[investigationId]/evidence/[evidenceId]/share`, `GET /api/investigations/[investigationId]/evidence/shared`
- Team Endpoints: `GET /api/teams`, `POST /api/teams`, `GET /api/teams/[teamId]`, `PATCH /api/teams/[teamId]`, `GET /api/teams/[teamId]/members`, `DELETE /api/teams/[teamId]/members/me`, `DELETE /api/teams/[teamId]/members/[userId]`, `POST /api/teams/[teamId]/transfer-leadership`, `GET /api/teams/[teamId]/invitations`, `POST /api/teams/[teamId]/invitations`, `DELETE /api/teams/[teamId]/invitations/[invitationId]`, `GET /api/invitations/[token]`, `POST /api/invitations/[token]/accept`, `POST /api/invitations/[token]/decline`

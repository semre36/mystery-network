# MYSTERY NETWORK — Project Structure

This document outlines the file system layout, domain boundaries, and where upcoming features will be implemented throughout the 14 project phases.

```
mystery-network/
│
├── public/                     # Static public assets served directly by Next.js
│   ├── images/                 # Public case banners, teaser artwork, branding
│   ├── icons/                  # PWA and Mini App icons, SVG emblems
│   └── fonts/                  # Custom typography files
│
├── src/
│   ├── app/                    # Next.js App Router (Routes, Layouts, API Endpoints)
│   │   ├── layout.tsx          # Root HTML shell, dark theme metadata, viewport settings
│   │   ├── page.tsx            # Foundation landing page (Phase 01)
│   │   ├── globals.css         # Tailwind CSS styling, dark detective theme variables
│   │   ├── error.tsx           # Global uncaught error boundary
│   │   ├── not-found.tsx       # Detective-themed 404 handler
│   │   └── api/
│   │       └── health/
│   │           └── route.ts    # Liveness check endpoint (GET /api/health)
│   │
│   ├── components/             # Reusable UI component library
│   │   ├── ui/                 # Headless & design primitives (buttons, dialogs, inputs)
│   │   ├── shared/             # Domain-agnostic composite widgets (navbars, card decks)
│   │   └── layouts/            # Page templates (detective dashboard frame, dossier view)
│   │
│   ├── modules/                # Modular Monolith Domain Modules
│   │   ├── authentication/     # Phase 04: Telegram WebApp auth & session issuance
│   │   ├── players/            # Phase 05: Investigator profiles, stats, settings
│   │   ├── cases/              # Phase 06: Mystery case definitions, acts, narrative episodes
│   │   ├── investigations/     # Phase 07: Player investigation sessions & state machines
│   │   ├── evidence/           # Phase 08: Clues, forensic documents, asymmetric distribution
│   │   ├── teams/              # Phase 09: Squads, invites, clue trading channels
│   │   ├── puzzles/            # Phase 10: Interactive minigames, ciphers, decryption engines
│   │   ├── submissions/        # Phase 12: Accusations, theory verification, scoring
│   │   ├── progression/        # Phase 12: XP calculations, detective badges, leaderboards
│   │   ├── notifications/      # Future: In-app alerts, Telegram bot event dispatches
│   │   └── administration/     # Phase 13: Operational dashboards & case authoring
│   │
│   ├── lib/                    # Shared Foundation Libraries
│   │   ├── config/             # Centralized environment configuration via Zod
│   │   ├── constants/          # Application-wide immutable constants
│   │   ├── errors/             # Custom error hierarchy (AppError)
│   │   ├── logger/             # Centralized structured logger with field redaction
│   │   ├── utils/              # General helper functions (e.g. cn for styling)
│   │   └── validation/         # Common validation schemas & cross-domain validators
│   │
│   ├── server/                 # Server-Only Infrastructure & Security
│   │   ├── infrastructure/     # Infrastructure clients & adapters
│   │   │   └── database/       # Prisma Client singleton & connection management
│   │   ├── services/           # Cross-module server orchestration services
│   │   └── security/           # Rate limiting guards, cryptographic helpers, RBAC
│   │
│   ├── hooks/                  # Custom React client hooks
│   ├── types/                  # Shared global TypeScript definitions
│   └── styles/                 # Additional style modules & theme overrides
│
├── prisma/                     # Database Schema & Migrations
│   ├── schema.prisma           # Prisma 6 schema targeting Neon PostgreSQL
│   └── seed.ts                 # Idempotent development & benchmark seed script
│
├── docs/                       # Project Documentation
│   ├── PRODUCT_OVERVIEW.md     # Vision, target audience, gameplay loops
│   ├── ARCHITECTURE.md         # Modular monolith architecture & design decisions
│   ├── DATABASE_ARCHITECTURE.md# Complete database specification, ER diagram, index strategy
│   ├── DEVELOPMENT_GUIDELINES.md # Code standards, TypeScript rules, test patterns
│   ├── SECURITY_STANDARDS.md   # Secret isolation, HMAC verification, auth boundaries
│   ├── PROJECT_STRUCTURE.md    # Directory layout & domain mapping (this file)
│   └── DEVELOPMENT_ROADMAP.md  # 14-phase development status & acceptance checklist
│
├── tests/                      # Automated Test Suites
│   ├── health.test.ts          # API liveness & response schema test
│   ├── foundation.test.ts      # Core utility, error, and logger unit tests
│   └── database.test.ts        # Database client singleton, models, and validation tests
│
├── .env.example                # Documented environment template
├── .gitignore                  # Git exclusions for secrets, builds, and node_modules
├── .prettierrc                 # Code formatting configuration
├── eslint.config.mjs           # ESLint flat configuration
├── next.config.ts              # Next.js build and runtime configuration
├── package.json                # Project dependencies and lifecycle scripts
├── tsconfig.json               # Strict TypeScript configuration
├── vitest.config.mts           # Vitest unit test configuration
└── README.md                   # Repository overview and getting started guide
```

---

## Where Features Belong

| Domain / Feature                       | Location & Target Directory                                               |
| :------------------------------------- | :------------------------------------------------------------------------ |
| **Prisma Schema & Migrations**         | `prisma/schema.prisma` and `prisma/migrations/`                           |
| **Database Client Singleton**          | `src/server/infrastructure/database/index.ts`                             |
| **Database Seeding**                   | `prisma/seed.ts`                                                          |
| **Telegram Bot Handlers**              | `src/server/infrastructure/telegram/` and `src/app/api/telegram/webhook/` |
| **Telegram InitData Validation**       | `src/modules/authentication/services/telegram-auth.ts`                    |
| **Investigator Dossier & Stats**       | `src/modules/players/` and `src/app/investigator/`                        |
| **Investigation Board (Canvas/Nodes)** | `src/components/investigation-board/` and `src/modules/investigations/`   |
| **Cipher Minigames & Decoders**        | `src/modules/puzzles/`                                                    |
| **Admin Case Authoring Studio**        | `src/modules/administration/` and `src/app/admin/`                        |

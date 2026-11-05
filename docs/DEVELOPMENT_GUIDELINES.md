# MYSTERY NETWORK — Development Guidelines

## 1. Naming Conventions

| Category                          | Convention         | Examples                                                     |
| :-------------------------------- | :----------------- | :----------------------------------------------------------- |
| **Files & Folders**               | `kebab-case`       | `app-error.ts`, `health-check.ts`, `case-card.tsx`           |
| **React Components**              | `PascalCase`       | `GlobalError`, `CaseCard`, `InvestigationBoard`              |
| **Functions & Methods**           | `camelCase`        | `formatLogEntry()`, `validateClue()`, `fetchCaseById()`      |
| **Constants & Enums**             | `UPPER_SNAKE_CASE` | `APP_NAME`, `MAX_RETRIES`, `DEFAULT_PAGE_SIZE`               |
| **TypeScript Types & Interfaces** | `PascalCase`       | `HealthCheckResponse`, `PlayerProfile`, `InvestigationState` |

---

## 2. TypeScript Rules

- **Strict Mode Enabled**: `tsconfig.json` enforces `"strict": true` and `"noEmit": true`.
- **No `any`**: Do not use `any`. Use `unknown` for unvalidated input, followed by Zod parsing or type guards.
- **Explicit Boundary Types**: API route handlers, service methods, and exported module interfaces must define explicit return types and parameters.
- **Never Suppress Type Errors**: Do not use `@ts-ignore` or `@ts-nocheck` to mask compilation issues. Resolve the root cause.
- **Path Aliases**: Always use `@/*` to reference `src/*` paths rather than brittle relative paths (`../../..`).

---

## 3. Component Organization

- **Server Components by Default**: In Next.js App Router, keep components as React Server Components unless client-side state, event handlers (`onClick`), or browser APIs are required.
- **Client Boundary Minimization**: When client interactivity is necessary, push `"use client"` down to the smallest possible leaf component.
- **Single Responsibility**: Components must focus solely on rendering UI and dispatching user actions. Business rules, validation logic, and data transformation belong in domain modules.
- **Styling**: Use utility classes via Tailwind CSS, merged with `cn()` when conditional classnames are needed.

---

## 4. Error Handling Standards

- **Use `AppError`**: Operational errors must instantiate or extend `AppError`:
  ```typescript
  import { AppError } from "@/lib/errors/app-error";

  throw new AppError("Invalid case identifier provided", 400, "INVALID_CASE_ID", true, {
    caseId,
  });
  ```
- **Safe Client Responses**: Never return raw stack traces or internal database error messages to clients.
- **Catch & Log**: In server route handlers and actions, catch unexpected errors, log them via `logger.error()`, and return a normalized 500 response.

---

## 5. Testing Expectations

- **Test Runner**: Vitest is configured as the testing framework (`npm run test`).
- **Unit Tests**:
  - All shared library utilities (`src/lib/*`) must have unit tests.
  - Core domain calculations (e.g., scoring formulas, XP thresholds, puzzle validators) must be covered with deterministic unit tests.
- **Integration Tests**:
  - API route handlers must be tested for status codes, headers, and payload schema conformance.
- **Clean Test Environments**: Tests must not rely on external network calls or persistent state between test suites.

---

## 6. Git Conventions

- **Branch Naming**:
  - `feature/<phase-number>-<short-description>` (e.g., `feature/02-database-prisma`)
  - `fix/<issue-description>`
  - `chore/<task-description>`
- **Commit Messages**: Follow Conventional Commits:
  - `feat(auth): implement telegram initData validation`
  - `fix(puzzles): correct cipher rotation modulo`
  - `docs(arch): update module boundary specifications`
  - `chore(deps): update nextjs to 16.4.5`
- **Clean Diffs**: Format all files before committing via `npm run format`.

---

## 7. Database & Prisma Rules

- **Singleton Usage**: Always import the Prisma Client instance from `@/server/infrastructure/database`. Never instantiate `new PrismaClient()` directly in application code.
- **Server Isolation**: Database access must remain strictly in server modules (`src/server/*` or server route handlers). Never import database clients in React Client Components (`"use client"`).
- **Explicit Projections**: Use Prisma `select` projections to fetch only required fields. Never return raw database records containing `solutionHash`, `metadata`, or private token digests.
- **Transactions for Multi-Record Operations**: Use `prisma.$transaction()` for interdependent writes (e.g. creating an investigation and its participants, or deducting clues and awarding XP).
- **Migration Hygiene**: Never edit existing applied migration files manually. Always generate migrations via `npm run db:migrate`.

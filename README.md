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
```

---

## Architectural Documentation

Full architectural specifications, security rules, and roadmaps are located in the [`docs/`](./docs) directory:

- [Product Overview](./docs/PRODUCT_OVERVIEW.md)
- [Architecture & Modular Monolith Design](./docs/ARCHITECTURE.md)
- [Development Guidelines](./docs/DEVELOPMENT_GUIDELINES.md)
- [Security Standards](./docs/SECURITY_STANDARDS.md)
- [Project Structure & Directory Map](./docs/PROJECT_STRUCTURE.md)
- [Development Roadmap](./docs/DEVELOPMENT_ROADMAP.md)

---

## Verification & Status

- **Phase 01: Project Foundation** — Active / Ready for Verification.
- Health Endpoint: `GET /api/health`

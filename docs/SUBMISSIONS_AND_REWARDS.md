# MYSTERY NETWORK — SUBMISSIONS, EVALUATION & PLAYER REWARDS (PHASE 12)

## 1. Overview

Phase 12 introduces the climactic deduction and adjudication pipeline for **MYSTERY NETWORK**. Operatives formulate indictments, designate prime suspects, construct motive and technical vectors, analyze forensic timelines, and formally submit their conclusions to the server-only deterministic evaluation engine. Concluded cases yield auditable XP, detective rank promotions, and cryptographic-grade milestone accolades.

---

## 2. Submission Lifecycle

The case indictment workflow is split into two non-interfering phases:

```
[In-Progress Investigation]
           │
           ▼
   [Draft Indictment] ◄─── Operatives / Squad collaborate & save iteratively
           │
           ▼
[Formal Case Indictment] (Pre-Submission Checklist & Immutability Confirmation)
           │
           ▼
[Lead Investigator Submit] (Server-Side Deterministic Evaluation Transaction)
           │
           ├──► [SOLVED_PERFECT] (Score >= 90 & Correct Suspect) ──► SOLVED Investigation + Max Rewards
           ├──► [SOLVED_PARTIAL] (Score >= 60 & Correct Suspect) ──► SOLVED Investigation + Base Rewards
           └──► [INCORRECT]      (Score < 60 or Wrong Suspect)   ──► FAILED Investigation + Discrepancy Report
```

### In-Progress Drafts

- Operatives can iteratively draft motives, methods, timeline summaries, and attach evidence citations without triggering premature grading.
- In multiplayer investigations, squad detectives share visibility of the draft to synthesize findings collectively.

### Immutability & Concurrency Protections

- Once formally submitted, the indictment transitions to `EVALUATED` status and is permanently locked against further tampering or edits.
- Only the **Lead Investigator** (or squad owner) has operational authority to submit a final indictment on behalf of a squad in cooperative play.
- Concluded investigations (`SOLVED`, `FAILED`, `ABANDONED`) reject subsequent draft updates or duplicate submissions (`INVESTIGATION_TERMINAL`).

---

## 3. Server-Only Deterministic Evaluation Engine

The evaluation engine is 100% server-side, deterministic, and cryptographically protected against answer sniffing or client data leakage.

### Scoring Dimensions (Total: 100 Points)

| Dimension                  | Max Points | Evaluation Logic                                                                                                          |
| :------------------------- | :--------: | :------------------------------------------------------------------------------------------------------------------------ |
| **Primary Suspect**        |     30     | Binary: 30 pts if `primaryCharacterId` matches `solutionConfig.primaryCharacterId`; 0 pts otherwise.                      |
| **Motive Analysis**        |     15     | Keyword matching against case-specific motive vectors. Partial points granted proportionally based on identified vectors. |
| **Method / Infiltration**  |     15     | Keyword matching against operational vector, murder weapon, and digital breach signatures.                                |
| **Timeline Chronology**    |     15     | Chronological milestone and timestamp keyword matching.                                                                   |
| **Supporting Evidence**    |     15     | Proportion of required supporting clues cited by the operative.                                                           |
| **Contradicting Evidence** |     10     | Proportion of contradictory / alibi clues correctly recognized and addressed.                                             |

### Adjudication Categories

- **`SOLVED_PERFECT`**: Score $\ge 90$ with correct prime suspect. Marks case `SOLVED`, unlocks all chapter progress, awards base XP + full bonus XP.
- **`SOLVED_PARTIAL`**: Score $\ge 60$ with correct prime suspect. Marks case `SOLVED`, unlocks chapter progress, awards base XP.
- **`INCORRECT`**: Score $< 60$ or incorrect prime suspect. Marks case `FAILED`.

### Constructive Feedback & Zero-Secret Leakage

Evaluations construct granular feedback dossiers containing:

- **Correct Conclusions**: Deductive triumphs recognized by forensic intelligence.
- **Missed Reasoning Areas**: Incomplete motive or method vectors without exposing secret solution values.
- **Evidence Feedback**: Categorized breakdown of useful references, missed clues, and unsupported citations.
- **Recommendations**: Investigative advice tailored to missing operational vectors.
- Raw `solutionConfig`, secret answer hashes, and keyword lists are stripped before returning responses to client runtimes.

---

## 4. Player Progression & Leveling Formula

### Mathematical Formula

$$\text{Level} = \left\lfloor 1 + \sqrt{\frac{\text{Total XP}}{100}} \right\rfloor$$

$$\text{Threshold}(\text{Level}) = (\text{Level} - 1)^2 \times 100$$

### Detective Level Thresholds & Clearance Tiers

| Level  | Minimum XP | Rank Title         | Clearance Level           |
| :----: | :--------: | :----------------- | :------------------------ |
| **1**  |     0      | Junior Operative   | LEVEL 1 — CONFIDENTIAL    |
| **2**  |    100     | Junior Operative   | LEVEL 1 — CONFIDENTIAL    |
| **3**  |    400     | Field Investigator | LEVEL 2 — RESTRICTED      |
| **4**  |    900     | Field Investigator | LEVEL 2 — RESTRICTED      |
| **7**  |   3,600    | Senior Detective   | LEVEL 3 — SECRET          |
| **12** |   12,100   | Lead Inspector     | LEVEL 4 — TOP SECRET      |
| **20** |   36,100   | Master Sleuth      | LEVEL 5 — OMEGA CLEARANCE |

---

## 5. Idempotent Reward Processing & XP Ledger

### Atomic Idempotency via `referenceKey`

Every XP award generates a deterministic reference key:

- **Case Resolution**: `xp:case_solve:${investigationId}:${playerId}`
- **Achievement Unlocks**: `xp:achievement:${achievementCode}:${playerId}`

Database-level `@unique` constraint on `XPTransaction.referenceKey` guarantees that accidental retries, concurrent duplicate requests, or network flakiness never award duplicate XP or corrupt progression records.

---

## 6. Accolades & Achievement Catalog

Registered achievements in `prisma/seed.ts`:

1. `FIRST_CASE_SOLVED`: Solve your first case on Mystery Network (+100 XP).
2. `PERFECT_INVESTIGATION`: Achieve a flawless score of 95 or higher on a case indictment (+150 XP).
3. `EVIDENCE_EXPERT`: Cite all key supporting and contradictory evidence in a final indictment (+120 XP).
4. `PUZZLE_SPECIALIST`: Successfully solve all interactive puzzles and cryptographic challenges (+150 XP).
5. `TEAM_PLAYER`: Complete an investigation as part of a cooperative operative squad (+100 XP).
6. `MASTER_DETECTIVE`: Attain Senior Detective clearance rank (Level 7+) (+300 XP).
7. `CAMPAIGN_COMPLETED`: Successfully solve all canonical benchmark campaign cases (+500 XP).

---

## 7. API Reference

| Endpoint                                                   | Method | Description                                                       |
| :--------------------------------------------------------- | :----: | :---------------------------------------------------------------- |
| `/api/investigations/[investigationId]/submissions`        | `GET`  | Retrieve active draft or evaluated submission.                    |
| `/api/investigations/[investigationId]/submissions`        | `POST` | Save or update in-progress indictment draft.                      |
| `/api/investigations/[investigationId]/submissions/submit` | `POST` | Formal final submission, evaluation, and reward transaction.      |
| `/api/investigations/[investigationId]/results`            | `GET`  | Retrieve official judgment report and dimension scores.           |
| `/api/player/progression`                                  | `GET`  | Retrieve player level, rank, XP progress, and transaction ledger. |
| `/api/player/achievements`                                 | `GET`  | Retrieve catalog of all achievements with unlock states.          |

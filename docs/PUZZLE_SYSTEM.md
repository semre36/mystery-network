# MYSTERY NETWORK — INTERACTIVE PUZZLE ENGINE & INVESTIGATION CHALLENGES (PHASE 10)

## 1. System Overview

The **Interactive Puzzle Engine** is the cryptanalysis and forensic obstacle sub-system of MYSTERY NETWORK. It delivers interactive cryptographic puzzles, frequency decoders, logic ordering matrices, access-code terminals, and multi-stage gateways that operatives encounter within active investigations.

### Core Objectives

1. **Server-Side Answer Validation**: Zero plaintext answers or secret cipher keys are ever transmitted to the client application.
2. **Timing-Safe Cryptographic Matching**: Solutions are evaluated using keyed HMAC-SHA256 digests and `crypto.timingSafeEqual`.
3. **Pluggable Validator Architecture**: Extensible challenge algorithms supporting Caesar ciphers, monoalphabetic substitutions, polyalphabetic Vigenère ciphers, steganography/acrostic patterns, chronological logic deductions, alphanumeric access codes, and multi-stage gateways.
4. **Multiplayer Cooperative Progress**: Solved puzzles immediately unlock investigation progress across all squad members while tracking individual attempt histories per operative.
5. **Anti-Brute Force Protection**: Advisory transaction locks (`pg_advisory_xact_lock`) and configurable attempt limits enforce lockout boundaries.
6. **Progressive Hint Declassification**: Hints unlock conditionally based on attempt counts or prerequisite events without spoiling solutions.

---

## 2. Cryptographic Security & Normalization Model

All answers undergo canonical normalization prior to validation or hashing to prevent false rejections due to casing, formatting differences, or invisible unicode whitespace.

### 2.1. Normalization Pipeline (`src/modules/puzzles/utils/crypto.util.ts`)

```
Raw Submission ──> Unicode NFKC ──> Case Folding (Uppercase) ──> Punctuation Handling ──> Whitespace Normalization ──> Canonical Answer
```

1. **Unicode NFKC Normalization**: Strips diacritics and converts compatibility characters to canonical equivalents.
2. **Case Folding**: Converts to uppercase by default unless `caseSensitive: true` is configured in `secretConfiguration`.
3. **Punctuation Stripping**: Replaces punctuation and control symbols (`/[^\p{L}\p{N}\s]/gu`) unless `stripPunctuation: false` is set (e.g. For hyphenated terminal codes or comma-delimited logic sequences).
4. **Whitespace Collapsing**: Collapses consecutive whitespace characters into a single space and trims extremities, or eliminates whitespace completely when `stripWhitespace: true`.

### 2.2. Keyed HMAC-SHA256 Hashing

```typescript
export function hashAnswer(answer: string, salt: string = ""): string {
  const hmac = crypto.createHmac("sha256", SERVER_SECRET);
  hmac.update(`${salt}:${answer.trim()}`);
  return hmac.digest("hex");
}
```

Low-entropy solutions (such as 4-digit PINs or single-word cipher keys) are protected against pre-computed rainbow table attacks using a keyed server-side HMAC and puzzle-specific salts. Comparisons utilize constant-time buffers via `crypto.timingSafeEqual` to eliminate timing side-channel vulnerabilities.

---

## 3. Supported Challenge Types & Algorithmic Validators

| Puzzle Type           | Algorithm / Validator           | Secret Configuration                                 | Client DTO Scrubbing                                       |
| --------------------- | ------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `CAESAR_CIPHER`       | `CaesarCipherValidator`         | `{ shift: number, solution: string }`                | Shift and plaintext stripped; ciphertext and clue retained |
| `SUBSTITUTION_CIPHER` | `SubstitutionCipherValidator`   | `{ substitutionAlphabet: string, solution: string }` | Alphabet mapping and plain text stripped                   |
| `VIGENERE_CIPHER`     | `VigenereCipherValidator`       | `{ keyword: string, solution: string }`              | Keyword and plain solution stripped                        |
| `HIDDEN_MESSAGE`      | `HiddenMessageValidator`        | `{ patternType: string, solution: string }`          | Extraction rule stripped; carrier text retained            |
| `LOGIC_CHALLENGE`     | `LogicChallengeValidator`       | `{ targetSequence: string[], solution: string }`     | Correct sequence stripped; item pool and clues retained    |
| `ACCESS_CODE`         | `AccessCodeValidator`           | `{ solution: string, codeFormat: string }`           | Code stripped; prompt format and mask retained             |
| `MULTI_STAGE`         | Sequenced `PuzzleStage` records | Stage-specific secret configs                        | Future stages concealed until prior stage completion       |

---

## 4. Multi-Stage Puzzles (`PuzzleStage`)

For complex defense networks and layered terminals:

- `isMultiStage: true` indicates a composite puzzle composed of ordered stages.
- Each `PuzzleStage` has its own `stageOrder`, `puzzleType`, `instructions`, `publicConfiguration`, `secretConfiguration`, and `maxAttempts`.
- The active stage is tracked per investigation via `PuzzleProgress.currentStageOrder`.
- Operatives cannot view or submit attempts for future locked stages (`stageOrder > currentStageOrder`).
- Solving an intermediate stage advances `currentStageOrder` to the next step.
- Solving the final stage marks `PuzzleProgress.status = SOLVED` for the entire squad.

---

## 5. Attempt Tracking, Concurrency & Lockout Mechanics

### 5.1. Database Isolation & Concurrency

Submissions are executed within a serializable transaction wrapped by a PostgreSQL advisory transaction lock:

```sql
SELECT pg_advisory_xact_lock(hashtext('puzzle_attempt:' || $investigationId || ':' || $puzzleId))
```

This guarantees that concurrent rapid submissions from the same operative (or different operatives in a squad) do not cause race conditions, duplicate solves, or bypass attempt quotas.

### 5.2. Attempt Quotas

- Every submission is recorded as an immutable `PuzzleAttempt` tied to `playerId`.
- If `maxAttempts` is configured on the puzzle or stage, an operative who reaches the threshold is locked out (`HTTP 429 ATTEMPT_LIMIT_REACHED`).

---

## 6. Progressive Tactical Hint Hierarchy

Hints provide contextual investigation assistance without revealing solutions outright:

- Each `PuzzleHint` contains `hintOrder`, `title`, `content`, and `unlockConditions` (e.g. `{ minAttempts: 1 }`).
- Locked hints are concealed in `SafePuzzleHintDto` with `content: null`.
- Operatives submit a request to unlock a hint via `POST /api/investigations/[id]/puzzles/[id]/hints/[hintId]/unlock`.
- The server validates that the operative has logged at least `minAttempts`.
- Unlocked hints are recorded in `InvestigationUnlockedHint` and become readable by all operatives in the squad.

---

## 7. REST API Reference

| Method | Endpoint                                                                | Description                                                                       |
| ------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET`  | `/api/investigations/[id]/puzzles`                                      | List all investigation challenges with squad status and operative attempt metrics |
| `GET`  | `/api/investigations/[id]/puzzles/[puzzleId]`                           | Retrieve detailed puzzle chamber and public configuration                         |
| `POST` | `/api/investigations/[id]/puzzles/[puzzleId]/attempts`                  | Submit solution for verification on standard puzzle                               |
| `GET`  | `/api/investigations/[id]/puzzles/[puzzleId]/attempts`                  | Retrieve operative attempt history                                                |
| `GET`  | `/api/investigations/[id]/puzzles/[puzzleId]/stages/[stageId]`          | Inspect specific stage of a multi-stage challenge                                 |
| `POST` | `/api/investigations/[id]/puzzles/[puzzleId]/stages/[stageId]/attempts` | Submit solution for a specific multi-stage step                                   |
| `POST` | `/api/investigations/[id]/puzzles/[puzzleId]/hints/[hintId]/unlock`     | Unlock progressive tactical hint                                                  |

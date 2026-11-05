# Investigations Module

## Domain Boundary

Tracks active investigation instances, clue unlock states, timeline progress, and case state machines.

## Scheduled Phase

- **Phase 07**: Investigation Engine & State Coordinator.

## Boundary Rules

- Enforces valid state transitions (e.g. In Progress -> Solved / Cold).
- Coordinates with `evidence` and `teams` modules.

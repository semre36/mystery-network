# Notifications Module

## Domain Boundary

Manages notification dispatch, message templates, user notification preferences, and delivery channels.

## Scheduled Phase

- Future Phases (integrated with Telegram Bot dispatching).

## Boundary Rules

- Decoupled from core game logic via event-driven triggers.
- Honors user privacy and quiet hour settings.

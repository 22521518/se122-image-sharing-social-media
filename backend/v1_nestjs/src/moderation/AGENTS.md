# Moderation Module Agent Rules

## Dependency Rules
1.  **Event Driven**: Ideally, reporting logic reacts to events, but direct Report API calls are fine for MVP.
2.  **Privacy**: Moderation logs should be secure.
3.  **Imports**:
    - `Auth` (Guards)
    - `Common`

## Access Control
- All "Action" endpoints (Ban, Delete, Resolve) MUST be protected by `RolesGuard` checking for `Moderator` or `Admin` role.

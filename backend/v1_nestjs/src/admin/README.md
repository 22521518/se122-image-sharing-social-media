# Admin Module

## Role
This module powers the **Admin Dashboard**. It provided system-wide visibility and control.

## Capabilities
- **User Management**: Ban/Unban, promote users.
- **System Stats**: Monitor storage, active users (via `Media`, `Auth` services).
- **Configuration**: System-wide settings.

## Dependencies
- **AuthModule**: For RBAC checks.
- **Any Other Module**: Admin often needs to query data from `Memories`, `Social`, etc., for statistics.

## Security
- **Strict Role Check**: All endpoints must require `Role.ADMIN`.

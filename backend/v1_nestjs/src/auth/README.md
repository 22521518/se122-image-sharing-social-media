# Auth Module

## Role
This module handles all user authentication, including registration, login, and token management. It serves as the secure gatekeeper for the application.

## Strategy
We utilize a **JWT (JSON Web Token)** based authentication strategy.

- **Access Token**: Short-lived (15 minutes). Used for accessing protected resources.
- **Refresh Token**: Long-lived (7 days). Used to obtain new access tokens without re-login. Securely stored (e.g., HTTP-only cookie).

## Dependencies
- **CommonModule**: For shared utilities.

## Exports
- **AuthService** (limited scope)
- **Guards**: `JwtAuthGuard`, `LocalAuthGuard` (likely global or applied via decorators)

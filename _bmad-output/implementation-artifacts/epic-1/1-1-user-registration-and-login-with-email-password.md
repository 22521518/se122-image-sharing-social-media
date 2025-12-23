# Story 1.1: User Registration and Login with Email/Password

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new or returning user,
I want to create an account or log in using my email and a secure password,
so that I can access my personal memory space.

## Acceptance Criteria

1. **Given** I am on the auth page
   **When** I register with a valid email/password
   **Then** the system creates the user record and establishes a secure session
   **And** I am redirected to the onboarding flow (new user)

2. **Given** I am on the auth page
   **When** I log in with existing credentials
   **Then** the system verifies the user record and establishes a secure session
   **And** I am redirected to the map (returning user)

3. **Given** I try to register with an existing email
   **Then** I receive a clear error message indicating the email is already in use

4. **Given** I try to login with invalid credentials
   **Then** I receive a generic error message (security best practice)

## Tasks / Subtasks

- [x] Backend: Authentication Module Setup
  - [x] Initialize `auth` module structure (`backend/src/auth/`)
  - [x] Implement `RegisterDto` and `LoginDto` with validation
  - [x] Implement `AuthRepository` (if needed) or service layer logic for User creation
  - [x] Implement `AuthService.register(dto)` with password hashing (bcrypt)
  - [x] Implement `AuthService.login(dto)` with password verification
  - [x] Implement JWT strategy (Access Token 15m, Refresh Token 7d HttpOnly)
  - [x] Create API endpoints: `POST /auth/register`, `POST /auth/login`
  - [x] Unit tests for AuthService
  - [x] Integration tests for AuthController

- [x] Frontend: Auth Screens
  - [x] Initialize `(auth)` route group in `frontend/cross-platform/app/(auth)/`
  - [x] Create `register.tsx` screen with form (Email, Password, Confirm Password)
  - [x] Create `login.tsx` screen with form (Email, Password)
  - [x] Implement `AuthContext` to manage session state (user, token)
  - [x] Implement `auth.api.ts` service methods connecting to backend
  - [x] specific validation UI feedback (invalid email, weak password)

  - [x] [AI-Review][HIGH] Security: Refresh Token MUST be HttpOnly cookie, currently returned in JSON body (AuthUserController) [backend/v1_nestjs/src/auth-user/auth-user.controller.ts:28]
  - [x] [AI-Review][MEDIUM] Frontend: Implement automatic token refresh interceptor (Note: Deferred to Technical Hardening epic to allow MVP release)
  - [x] [AI-Review][MEDIUM] Documentation: Update story to reflect actual paths (auth -> auth-user/auth-core) and files (auth.api.ts -> api.service.ts)
  - [x] [AI-Review][MEDIUM] Cleanup: Remove unused/missing file references from story File List

## Dev Notes

### Technical Stack & Constraints (from Architecture)
- **Backend:** NestJS, TypeORM or Prisma (preferable), PostgreSQL
- **Frontend:** React Native (Expo) / React (Web) - unified codebase
- **Auth Pattern:** JWT (Access) + HttpOnly Cookie (Refresh)
- **Security:**
  - Passwords MUST be hashed (e.g., bcrypt/argon2)
  - Access Token: 15 min expiry
  - Refresh Token: 7 day expiry, stored in DB, HttpOnly cookie
- **Routing:** API `/auth/register`, `/auth/login`

### Project Structure Notes
- **Backend:** `src/auth/` module. Dependencies: Users module (likely needs creation or circular dep avoidance). Note pattern: Auth module usually imports Users module to manage user persistence.
- **Frontend:** File-based routing `app/(auth)/*`.
- **Database:** `users` table. Columns: `id` (UUID), `email`, `password_hash`, `created_at`, `updated_at`.
- **Naming:** STRICT `snake_case` for DB, `camelCase` for code.

### References
- [Architecture Index](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/architecture/00-INDEX.md)
- [Core Decisions](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/architecture/04-CORE-DECISIONS.md) (Decision 4: Auth, Decision 5: RBAC)
- [Project Structure](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/architecture/06-PROJECT-STRUCTURE.md)

## Dev Agent Record

### Agent Model Used
PLACEHOLDER_M7

### Debug Log References
- Check `sprint-status.yaml` for status updates.

### Completion Notes List
- Confirmed strict adherence to Architecture Decision 4 (JWT+Refresh).
- Included User/returning user flow distinction in AC.

### File List
- backend/v1_nestjs/src/auth-user/auth-user.controller.ts
- backend/v1_nestjs/src/auth-user/auth-user.service.ts
- backend/v1_nestjs/src/auth-core/strategies/jwt.strategy.ts
- backend/v1_nestjs/src/auth-core/auth-core.module.ts
- frontend/cross-platform/app/(auth)/login.tsx
- frontend/cross-platform/app/(auth)/register.tsx
- frontend/cross-platform/context/AuthContext.tsx

## Change Log
- 2025-12-21: Addressed Code Review findings:
  - Switched Refresh Token to HttpOnly cookie in `AuthUserController`.
  - Updated File List paths to match `v1_nestjs` structure.

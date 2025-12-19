# Story 1.1: User Registration and Login with Email/Password

Status: ready-for-dev

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

- [ ] Backend: Authentication Module Setup
  - [ ] Initialize `auth` module structure (`backend/src/auth/`)
  - [ ] Implement `RegisterDto` and `LoginDto` with validation
  - [ ] Implement `AuthRepository` (if needed) or service layer logic for User creation
  - [ ] Implement `AuthService.register(dto)` with password hashing (bcrypt)
  - [ ] Implement `AuthService.login(dto)` with password verification
  - [ ] Implement JWT strategy (Access Token 15m, Refresh Token 7d HttpOnly)
  - [ ] Create API endpoints: `POST /auth/register`, `POST /auth/login`
  - [ ] Unit tests for AuthService
  - [ ] Integration tests for AuthController

- [ ] Frontend: Auth Screens
  - [ ] Initialize `(auth)` route group in `frontend/cross-platform/app/(auth)/`
  - [ ] Create `register.tsx` screen with form (Email, Password, Confirm Password)
  - [ ] Create `login.tsx` screen with form (Email, Password)
  - [ ] Implement `AuthContext` to manage session state (user, token)
  - [ ] Implement `auth.api.ts` service methods connecting to backend
  - [ ] specific validation UI feedback (invalid email, weak password)

## Dev Notes

### Technical Stack & Constraints (from Architecture)
- **Backend:** NestJS, TypeORM, PostgreSQL
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
- backend/src/auth/*
- backend/src/users/* (if not separate story)
- frontend/cross-platform/app/(auth)/*

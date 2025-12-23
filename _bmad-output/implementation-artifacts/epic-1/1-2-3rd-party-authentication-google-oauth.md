# Story 1.2: 3rd Party Authentication (Google/OAuth)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user who prefers convenience**,
I want to **sign up or log in using my Google account or other 3rd party providers**,
so that **I don't have to remember another password**.

## Acceptance Criteria

1. **Given** I am on the auth page
2. **When** I select "Sign in with Google" (or other supported provider) and complete the OAuth flow
3. **Then** the system links the provider ID to a user record (creating one if necessary)
4. **And** I am successfully authenticated and logged into the platform

## Tasks / Subtasks

- [x] Backend: Setup Google OAuth Strategy
  - [x] Install `passport-google-oauth20` and `@nestjs/passport` types
  - [x] Configure `GoogleStrategy` in `auth-core/strategies/google.strategy.ts`
  - [x] Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` to env validation
- [x] Backend: Implement Auth Controller Endpoints
  - [x] `GET /auth/google` (Initiates flow - in `auth-user` controller)
  - [x] `GET /auth/google/callback` (Handles return, validates user, issues JWT)
  - [x] **Enhancement:** Implement dynamic redirect logic in callback:
    - If request came from Web -> Redirect to Web Frontend URL (e.g., `https://app.lifemapped.com/auth/callback?token=...`)
    - If request came from Mobile -> Redirect to Deep Link (e.g., `lifemapped://auth/callback?token=...`)
- [x] Backend: Update AuthService
  - [x] Implement `validateGoogleUser` logic in `auth-core` or `auth-user` service as appropriate
  - [x] **Enhancement:** Handle Account Linking: If email already exists but user has no Google ID, trust the verified Google email and link the accounts (update user record with `googleId`).
  - [x] Ensure consistent JWT + Refresh Token issuance (Decision 4)
- [x] Frontend: Implement Login UI
  - [x] Add "Sign in with Google" button to Login/Register screens
  - [x] Handle OAuth redirect flow (Deep linking for mobile, window for web)
- [x] Testing: Verify OAuth Flow
  - [x] Unit tests for Strategy and Service
  - [x] Manual test with test Google functionality
- [x] Documentation & Agent Context
  - [x] Create/Update `AGENTS.md` in `src/auth-user` and `src/auth-core` describing module responsibilities and rules.
  - [x] Create/Update `README.md` in `src/auth-user` and `src/auth-core` with setup instructions.

- [ ] Review Follow-ups (AI)
  - [x] [AI-Review][HIGH] Security: Refresh Token EXPOSED in URL query params during callback redirect (AuthUserController:71). MUST use HttpOnly cookie for Refresh Token. (Fixed for Web, conditionally retained for Mobile Deep Link)
  - [x] [AI-Review][MEDIUM] Security/Architecture: Access Token also exposed in URL. Fixed: Implemented Hash Fragment redirect for Web to prevent server log leakage. Deep Link param retained for Mobile.
  - [ ] [AI-Review][MEDIUM] Security: Open Redirect Risk. Validate `baseUrl` against strictly allowed domain list, don't just rely on `process.env`.
  - [x] [AI-Review][MEDIUM] Documentation: Update story to reflect actual strategy path: `auth-user/strategies/google-user.strategy.ts` (not `auth-core`).

## Dev Notes

### Architecture Compliance

- **Authentication Pattern:** Must strictly follow **Decision 4: JWT Access Token + Refresh Token**. OAuth login must result in the same token pair response as email/password login.
- **Role Management:** New users created via OAuth default to role `User`.
- **Security:** Ensure `GOOGLE_CLIENT_SECRET` is never exposed to client. Use `ConfigService` for secrets.

### Technical Requirements

- **Library:** Use `@nestjs/passport` and `passport-google-oauth20`.
- **User Entity:** Ensure `User` entity supports nullable password (if OAuth only) OR separate `AuthProvider` table/relation if supporting multiple providers (Google, Apple, etc.). For MVP, adding `googleId` to User table is acceptable but clean separation is preferred.
- **Redirects & Deep Linking:**
    - Mobile: Use `AuthSession` API from Expo or deep linking scheme. Backend must detect source (via state param or header) to redirect correctly.
    - Web: Standard HTTP redirect.

### Project Structure Notes

- **Module:** Work primarily within `src/auth-user/` and `src/auth-core/` modules.
- **Common:** Use `src/common/` for any shared configs if needed, but Auth should be self-contained.

### References

- [Architecture Decision 4 (Auth)](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/architecture/01-PROJECT-CONTEXT.md#Decision-4-Authentication)
- [Epic 1 Definition](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/epics-and-stories/epics.md#Epic-1-Authentication-Profiles)

## Dev Agent Record

### Agent Model Used

Antigravity (simulating SM Agent)

### Completion Notes List

- Created story file.
- Status set to `ready-for-dev`.
- Updated with Validation Enhancements: Account Linking, Dynamic Redirects.
### File List
- backend/v1_nestjs/src/auth-user/auth-user.controller.ts
- backend/v1_nestjs/src/auth-user/strategies/google-user.strategy.ts
- backend/v1_nestjs/src/auth-user/auth-user.service.ts
- backend/v1_nestjs/src/auth-core/auth-core.module.ts
- frontend/cross-platform/app/(auth)/login.tsx

## Change Log
- 2025-12-21: Addressed Code Review Findings:
  - Secured Refresh Token: Removed from Web redirect URL (cookie only), kept for Mobile Deep Link.
  - Updated File List and paths.

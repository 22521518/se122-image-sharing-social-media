# Story 4.3: Postcard Unlock and Delivery

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **recipient of a postcard**,
I want **to be notified when a memory has unlocked**,
so that **I can relive that moment at the right time**.

## Acceptance Criteria

1. **Given** I have a locked postcard waiting for me
2. **When** the unlock condition is met:
   - **Time-Lock**: The current date >= unlock date (checked every 15 minutes via cron)
   - **Geo-Lock**: My GPS location is within 50 meters of the unlock location (checked via geofencing API)
3. **Then** the system transitions the postcard to an "Unlocked" state
4. **And** I receive a push notification with retry logic if delivery fails
5. **And** I can tap the notification to view the full photo and message with a special reveal animation
6. **And** the postcard is now permanently visible in my collection

## Tasks / Subtasks

- [ ] Task 1: Time-Lock Unlock Logic (AC: 2, 3)
  - [ ] Subtask 1.1: Configure `@nestjs/schedule` cron job to run every 15 minutes.
  - [ ] Subtask 1.2: Query `LOCKED` postcards where `unlockDate <= NOW` and `unlockDate IS NOT NULL`.
  - [ ] Subtask 1.3: Update status to `UNLOCKED` and trigger notification.
- [ ] Task 2: Geo-Lock Unlock Logic (AC: 2, 3)
  - [ ] Subtask 2.1: Implement geofencing on mobile (iOS: CLLocationManager, Android: Geofencing API).
  - [ ] Subtask 2.2: Register geofences for locked postcards within 1km of user's current location.
  - [ ] Subtask 2.3: On geofence entry, call `POST /postcards/check-location` with current coordinates.
  - [ ] Subtask 2.4: Backend calculates distance (Haversine). If <= 50m, unlock and notify.
- [ ] Task 3: Notification System with Retry (AC: 4)
  - [ ] Subtask 3.1: Trigger notification service on unlock.
  - [ ] Subtask 3.2: Implement retry logic with exponential backoff (3 retries: 1m, 5m, 15m).
  - [ ] Subtask 3.3: Store notification delivery status in DB.
- [ ] Task 4: Unlock Reveal Experience (AC: 5, 6)
  - [ ] Subtask 4.1: Create `PostcardViewer.tsx` with locked/unlocked state handling.
  - [ ] Subtask 4.2: Implement reveal animation (e.g., envelope opening, fade-in).
  - [ ] Subtask 4.3: Mark postcard as "viewed" after first unlock view.

## Dev Notes

- **Architecture Patterns**:
  - **Cron Frequency**: Every 15 minutes balances responsiveness (max 15min delay) with server load.
  - **Geofencing**: CRITICAL for battery efficiency. Do NOT poll GPS continuously. Use native geofencing APIs to wake the app only when near unlock location.
  - **Geo Precision**: Default 50m radius. This is tight enough to feel intentional but loose enough to account for GPS drift.
  - **Notification Retry**: Essential for offline users. Store attempts in `notification_log` table.
  - **Prefetch Optimization**: When user opens map, fetch locked postcards within 1km to register geofences proactively.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/postcards/postcards.scheduler.ts`
  - `backend/v1_nestjs/src/postcards/postcards.controller.ts`
  - `frontend/cross-platform/services/geofencing.ts` (New)
  - `frontend/cross-platform/screens/postcards/PostcardViewer.tsx`

- **Testing Standards**:
  - Unit test: Cron logic with mocked dates.
  - Unit test: Haversine distance calculation (50m threshold).
  - Integration test: Mock geofence trigger → Verify unlock → Verify notification.
  - Edge case: User offline during unlock → Verify retry delivers notification later.

### Project Structure Notes

- Requires `@nestjs/schedule` module.
- Mobile geofencing requires platform-specific implementations (use `react-native-geolocation-service` or native modules).

### References

- [Source: epics.md#Story 4.3: Postcard Unlock and Delivery]
- [Source: 01-PROJECT-CONTEXT.md#Rediscovery & Time-Locked Postcards]

## Dev Agent Record

### Agent Model Used

Antigravity (simulated SM)

### Debug Log References

N/A

### Completion Notes List

- Specified 15-minute cron frequency for time-locks.
- Defined 50m geo-lock radius with geofencing API requirement.
- Added notification retry logic with exponential backoff.
- Added reveal animation requirement.
- Added prefetch optimization for nearby locked postcards.

### File List

- `backend/v1_nestjs/src/postcards/postcards.scheduler.ts`
- `backend/v1_nestjs/src/postcards/postcards.controller.ts`
- `frontend/cross-platform/services/geofencing.ts`
- `frontend/cross-platform/screens/postcards/PostcardViewer.tsx`

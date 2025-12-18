# User Stories — Life Mapped

**Date:** 2025-12-19
**Project:** Life Mapped (se122-image-sharing-social-media)

---

## 1. Core Capture (The Voice Sticker)

### US1.1: Quick Voice Capture

**As a** reflective user on the go,
**I want to** record a 3-second voice clip with a single tap,
**so that** I can capture the raw "vibe" of a place without the pressure of writing a long note.

- **Acceptance Criteria:**
  - Record button is prominent on the map view.
  - Recording stops automatically at 5 seconds.
  - Audio is immediately attached to the current location.

### US1.2: Photo with Metadata

**As a** traveler,
**I want to** upload a photo and have the app automatically place it on the map using its EXIF data,
**so that** I don't have to manually search for the location.

- **Acceptance Criteria:**
  - App reads GPS coordinates from uploaded image.
  - App reads timestamp from image.
  - User can confirm or adjust the location before saving.

### US1.3: Feeling-First Pin

**As a** user without a photo,
**I want to** drop a pin on the map and add a voice sticker,
**so that** I can record a memory that is purely emotional or atmospheric.

- **Acceptance Criteria:**
  - Long-press or click-and-hold on map creates a new pin.
  - App generates a beautiful placeholder visual if no photo is provided.

---

## 2. Discovery & Rediscovery (The Teleport)

### US2.1: Serendipitous Teleport

**As a** "nostalgic nomad,"
**I want to** click a "Teleport" button and be jumped to a random past memory,
**so that** I can experience a "shiver" of self-recognition from a forgotten moment.

- **Acceptance Criteria:**
  - Teleport button triggers a 0.2s shutter flash animation.
  - Map centers on a random existing pin.
  - The associated Voice Sticker plays automatically upon arrival.

### US2.2: Map-Based Browsing

**As a** user exploring my history,
**I want to** drag the map and see a filmstrip of memories for the visible area,
**so that** I can see how my life has unfolded in a specific city or neighborhood.

- **Acceptance Criteria:**
  - Filmstrip updates dynamically as the map moves.
  - Clicking a filmstrip item centers the map on that pin.

---

## 3. Onboarding & Bulk Import

### US3.1: Bulk-Drop Import

**As a** new user with a large camera roll,
**I want to** drag and drop a folder of photos onto the web app,
**so that** I can quickly populate my life map with historical context.

- **Acceptance Criteria:**
  - Supports multiple file selection.
  - Extracts metadata for all files in the batch.
  - Groups photos by location/time to suggest "Memory Clusters."

### US3.2: Emotional Onboarding

**As a** first-time user,
**I want to** be asked a meaningful question (e.g., "Where did you feel most at home last year?") instead of a technical setup,
**so that** I immediately understand the emotional purpose of the app.

- **Acceptance Criteria:**
  - Onboarding flow starts with a text prompt.
  - Guides user to create their first pin based on that feeling.

---

## 4. Privacy & Sharing

### US4.1: Private by Default

**As a** private individual,
**I want** all my memories to be visible only to me by default,
**so that** I feel safe recording intimate thoughts.

- **Acceptance Criteria:**
  - New pins are marked "Private" automatically.
  - Sharing requires explicit user action per pin or per "Place Hub."

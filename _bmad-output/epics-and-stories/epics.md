---
stepsCompleted: [1, 2]
inputDocuments:
  - "./_bmad-output/project-prd_v2_2025-12-19.md"
  - "./_bmad-output/design-thinking-2025-12-18.md"
  - "./_bmad-output/data-spec_2025-12-19.md"
  - "./_bmad-output/analysis/brainstorming-session-2025-12-18T12-00-00Z.md"
  - "./_bmad-output/analysis/brainstorming-session-2025-12-18T12-05-00Z.md"
  - "./_bmad-output/analysis/brainstorming-session-2025-12-18T12-18-00Z.md"
  - "./_bmad-output/user-stories_2025-12-19.md"
  - "chat:vietnamese-usecases-2025-12-19"
---

# se122-image-sharing-social-media - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for se122-image-sharing-social-media, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Support "Voice Sticker" capture as the atomic memory unit (2–5 seconds of raw, unscripted audio) attached to a specific location and optional photo.
FR2: Provide one-tap, low-friction recording for Voice Stickers and automatically attach them to the current map location.
FR3: When uploading a photo, automatically extract EXIF location and timestamp and place the memory on the map, allowing the user to confirm or adjust.
FR4: Allow manual pin placement for "feeling-first" entries and support voice-only pins with generative visual placeholders when no photo is provided.
FR5: Provide a map-centric "Living Map" experience that visualizes all memories as pins and supports smooth pan/zoom interactions.
FR6: Implement a "Teleport" button that jumps the user to a random, non-repeating past memory, with a 0.2s shutter flash transition and automatic Voice Sticker playback.
FR7: Display a memory filmstrip/timeline that updates based on the current map view and allows centering the map on a selected memory.
FR8: Provide a Bulk-Drop Wall for historical import, allowing users to drag-and-drop multiple photos or folders for batch processing.
FR9: For bulk imports, perform browser-side EXIF extraction, suggest pin locations, group photos into clusters by time/location, and allow batch Voice Sticker creation.
FR10: Allow users to compose "Time-locked Postcards" (photo + message) that unlock either on a chosen future date or when the user revisits a specific location.
FR11: Ensure postcards remain in a locked state until the unlock condition is met, then transition to unlocked state and present the content to the intended recipient (self or trusted friend).
FR12: Allow users to register accounts using email or linked identity providers to create a personal, private space in the system. (UC1)
FR13: Allow users to authenticate (log in) with their credentials or linked accounts to securely access their memories. (UC2)
FR14: Allow users to view and edit their profile information, including display name, avatar, short bio/description, and privacy preferences. (UC3)
FR15: Allow users to create posts that can contain text, tags/hashtags, and attached images and/or Voice Stickers as content to share with others. (UC4)
FR16: Support uploading one or multiple images per post, with optional per-image captions or descriptions and basic ordering. (UC5)
FR17: Allow users to edit or delete their own posts and associated media, within defined constraints (e.g., time window or moderation rules). (UC6)
FR18: Provide a personalized feed showing recent posts and memories from users the current user follows. (UC7)
FR19: Provide an "Explore" or discovery view showing recommended posts and memories based on system-driven criteria (e.g., popularity, recency, or curated picks). (UC8)
FR20: Support search across posts, photos, hashtags, and user profiles so users can quickly locate relevant content or people. (UC9)
FR21: Allow users to like posts or images to express appreciation and influence engagement metrics. (UC10)
FR22: Allow users to comment on posts or images and view threaded discussions. (UC10)
FR23: Allow users to share posts or images within the platform (and optionally via external channels if designed) to increase reach. (UC10)
FR24: Allow users to follow or unfollow other users, updating their social graph and affecting which content appears in their feed. (UC11)
FR25: Allow users to report posts, comments, or accounts for violations of community standards, capturing reason and context for moderator/admin review. (UC12)
FR26: Provide moderators with tools to review, approve, hide, or delete posts and images that violate policies. (UC13)
FR27: Provide moderators with tools to review, hide, delete, or lock comments that violate rules of conduct. (UC14)
FR28: Allow administrators to manage user accounts, including locking/unlocking accounts and assigning roles such as granting or revoking moderator privileges. (UC15, UC18)
FR29: Provide administrators with system monitoring capabilities, including access to logs, usage statistics (users, posts, memories), and performance indicators. (UC16)
FR30: Provide administrators with an interface to manage and triage reports and complaints from users and moderators, including viewing, classifying, and resolving each report. (UC17)

### NonFunctional Requirements

NFR1: Privacy — The system must be private-by-default, with granular sharing controls (Private/Friends/Public) for memories, posts, and postcards, requiring explicit user action to share beyond Private.
NFR2: Performance — Map interactions (pan, zoom, loading visible pins) should respond in under 200 ms under normal conditions; 2–5 second audio clips must play back with no perceptible delay once visible.
NFR3: Web-first PWA — The product must be implemented as a high-quality Progressive Web App optimized for both desktop and mobile browsers before native implementations are considered.
NFR4: Data sovereignty — Users must be able to easily export all of their media (photos, audio) and associated metadata (locations, timestamps, notes, tags, unlock conditions) in a standard, portable format.

### Additional Requirements

- Memory pins must follow the structured data model defined in the data spec, including id, userId, timestamp, location (with PostGIS-compatible lat/lng), media (photo + voiceSticker), content (textNote, tags, feeling), privacy, and unlockCondition fields.
- Audio (Voice Stickers) must use web-friendly formats (AAC m4a or Opus webm) with durations enforced between 1 and 5 seconds and a target bitrate of ~64 kbps for fast loading and sufficient clarity.
- Photo uploads must support JPEG, HEIC (converted to JPEG/WebP server-side), and WebP, with original resolution up to 4K, display variants at ~1080p, and 300x300 thumbnails.
- EXIF metadata processing must preserve key fields (DateTimeOriginal, GPSLatitude, GPSLongitude) for location/time inference while stripping personally identifiable EXIF data when content is shared beyond Private.
- When a memory has a Voice Sticker but no photo, the system should generate a placeholder visual using abstract, generative art based on the recorded "feeling" tag and time-of-day (e.g., warm oranges for sunset, deep blues for night).
- Backend infrastructure should use S3-compatible object storage with CDN distribution for low-latency delivery of photos and audio, and PostgreSQL with PostGIS extensions for geographic queries such as bounding-box maps and nearby searches.
- APIs should at minimum support: multi-part memory upload (photo + audio + metadata), retrieval of memories within a geographic bounding box for the map, random-memory retrieval for Teleport, and bulk-import processing for historical uploads.
- UX must adhere to product principles: user-curated (no auto-generated memories in MVP), private-by-default, map as an aesthetically pleasing "art piece" rather than a dense data grid, and interactions that emphasize emotional reflection over social performance.
- Onboarding should use a "feeling-first" prompt (e.g., "Where did you feel most at home last year?") to guide the user into creating their first pin, reducing the "empty map" problem.
- Teleport behavior should feel like a delightful gift, not a disruptive or spammy jump; design should avoid over-frequent suggestions and respect user control.
- The system must support role-based access control for User, Moderator, and Admin roles, ensuring permissions are clearly separated and auditable.
- Moderation, privacy, and safety concerns identified in brainstorming (e.g., bystander audio privacy, safe revisit prompts, non-creepy personalization, map accessibility, and performance/battery constraints) should inform detailed technical and UX guardrails during implementation.

### Platform Availability (Web vs Mobile)

- Epic 1 – Authentication & Profiles: registration, login, logout, and profile editing available on Web & Mobile.
- Epic 2 – Core Memory Capture & Map: Living Map, pins, Voice Sticker capture, EXIF placement, manual pins, and filmstrip available on Web & Mobile.
- Epic 3 – Onboarding & Bulk Import: feeling-first onboarding on Web & Mobile; Bulk-Drop Wall (drag-and-drop folders / large photo batches) on Web only.
- Epic 4 – Rediscovery & Time-Locked Postcards: Teleport, postcard creation, and unlock/view flows available on Web & Mobile.
- Epic 5 – Social Posting, Feed & Discovery: post creation, multi-image upload, edit/delete, following feed, Explore, search, and sharing available on Web & Mobile (bulk media management UX optimized for Web).
- Epic 6 – Social Graph & Interactions: follow/unfollow, likes, and comments available on Web & Mobile.
- Epic 7 – Reporting & Content Moderation: end-user reporting available on Web & Mobile; moderator review dashboards and bulk moderation tools on Web only.
- Epic 8 – Admin, Roles & Observability: admin user/role management, system monitoring, and report handling on Web only (admin console).

### FR Coverage Map

FR1: Epic 2 – Core Memory Capture & Map — Voice Sticker capture attached to location-based pins.
FR2: Epic 2 – Core Memory Capture & Map — One-tap Voice Sticker recording linked to current map location.
FR3: Epic 2 – Core Memory Capture & Map — EXIF-based placement of uploaded photos on the map.
FR4: Epic 2 – Core Memory Capture & Map — Manual pin placement and feeling-first, voice-only entries with placeholders.
FR5: Epic 2 – Core Memory Capture & Map — Living Map visualization with smooth pan/zoom.
FR6: Epic 4 – Rediscovery & Time-Locked Postcards — Teleport to random, non-repeating past memory with shutter effect.
FR7: Epic 2 – Core Memory Capture & Map — Memory filmstrip/timeline bound to current map view.
FR8: Epic 3 – Onboarding & Bulk Import — Bulk-Drop Wall for historical photo import.
FR9: Epic 3 – Onboarding & Bulk Import — Browser-side EXIF clustering and batch Voice Sticker ritual.
FR10: Epic 4 – Rediscovery & Time-Locked Postcards — Creation of time-locked postcards (photo + message).
FR11: Epic 4 – Rediscovery & Time-Locked Postcards — Locked/unlock behavior and delivery to self or trusted friend.
FR12: Epic 1 – Authentication & Profiles — Account registration to create a private personal space.
FR13: Epic 1 – Authentication & Profiles — Secure login for returning users.
FR14: Epic 1 – Authentication & Profiles — Profile editing, avatar, bio, and privacy preferences.
FR15: Epic 5 – Social Posting, Feed & Discovery — Create posts with text, tags/hashtags, images, and Voice Stickers.
FR16: Epic 5 – Social Posting, Feed & Discovery — Upload multiple images per post with per-image captions and ordering.
FR17: Epic 5 – Social Posting, Feed & Discovery — Edit or delete the user’s own posts and media.
FR18: Epic 5 – Social Posting, Feed & Discovery — Personalized following feed of posts and memories.
FR19: Epic 5 – Social Posting, Feed & Discovery — Explore view for recommended content.
FR20: Epic 5 – Social Posting, Feed & Discovery — Search across posts, photos, hashtags, and users.
FR21: Epic 6 – Social Graph & Interactions — Likes on posts and images.
FR22: Epic 6 – Social Graph & Interactions — Comments and threaded discussions on posts/images.
FR23: Epic 5 – Social Posting, Feed & Discovery — Sharing posts or images within the platform (and optionally externally).
FR24: Epic 6 – Social Graph & Interactions — Follow/unfollow user relationships affecting feed content.
FR25: Epic 7 – Reporting & Content Moderation — User-side reporting of posts, comments, or accounts.
FR26: Epic 7 – Reporting & Content Moderation — Moderator tools to review, approve, hide, or delete posts.
FR27: Epic 7 – Reporting & Content Moderation — Moderator tools to hide, delete, or lock comments.
FR28: Epic 8 – Admin, Roles & Observability — Admin management of user accounts and roles (including moderators).
FR29: Epic 8 – Admin, Roles & Observability — System monitoring of logs, usage statistics, and performance.
FR30: Epic 8 – Admin, Roles & Observability — Admin interface to manage and resolve reports and complaints.

## Epic List

### Epic 1: Authentication & Profiles

Enable users to create secure accounts, log in, and manage their basic profile and privacy settings so they have a trusted personal space for memories and social activity.

**FRs covered:** FR12, FR13, FR14

### Epic 2: Core Memory Capture & Living Map

Allow users to capture intimate Voice Sticker memories tied to locations and photos, and explore them on a beautiful, map-first interface with a contextual filmstrip.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR7

### Epic 3: Onboarding & Bulk Import

Help new users quickly populate their map and understand the product’s emotional purpose through feeling-first onboarding and bulk import of past photos.

**FRs covered:** FR8, FR9

### Epic 4: Rediscovery & Time-Locked Postcards

Let users rediscover past versions of themselves via Teleport and receive time-locked postcards that unlock on revisit or at a scheduled time, making memories feel like gifts.

**FRs covered:** FR6, FR10, FR11

### Epic 5: Social Posting, Feed & Discovery

Allow users to publish rich posts, browse a personalized feed, explore recommended content, and search across the network to extend engagement beyond purely private memories.

**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR23

### Epic 6: Social Graph & Interactions

Support lightweight social relationships and interactions (follow, like, comment) that layer social connection on top of personal memories without forcing performance pressure.

**FRs covered:** FR21, FR22, FR24

### Epic 7: Reporting & Content Moderation

Provide a safe environment by enabling users to report harmful content and giving moderators effective tools to review and enforce community standards.

**FRs covered:** FR25, FR26, FR27

### Epic 8: Admin, Roles & Observability

Give administrators control over user accounts, roles, and system health so the platform can be operated, monitored, and evolved safely and reliably.

**FRs covered:** FR28, FR29, FR30

### Epic 0: Project Architecture & Module Setup

Initialize the project structure, establishing the core modules with their specific agent guidelines and documentation to ensure developer agents follow architectural constraints from the start.

**Rationale:** Before feature implementation, every module must exist with a clear boundary definition (`README.md`) and agent rules (`AGENTS.md`) to prevent "spaghetti code" and enforce the acyclic dependency graph defined in `06-PROJECT-STRUCTURE.md`.

**Modules to Initialize:**
1. `common/` (Shared utilities, guards, filters)
2. `auth/` (Authentication & Users)
3. `media/` (Media processing pipeline)
4. `memories/` (Core domain)
5. `postcards/` (Time-locked delivery)
6. `social/` (Feed, profiles, discovery)
7. `moderation/` (Safety tools)
8. `admin/` (System management)

## Epic 0: Project Architecture & Module Setup

Initialize the project structure, establishing the core modules with their specific agent guidelines and documentation to ensure developer agents follow architectural constraints from the start.

### Story 0.0: Project Scaffolding & CI/CD

As a Lead Architect,
I want to initialize the project repositories and base frameworks,
So that the development team has a standardized environment to work in.

**Acceptance Criteria:**
1. **Given** a clean environment
2. **When** I run the initialization scripts
3. **Then** a Monorepo strategy (Turbo or simple folders) is established
4. **And** the `frontend/cross-platform` (Expo) project is initialized
5. **And** the `frontend/web-console` (Vite) project is initialized
6. **And** the `backend` (NestJS) project is initialized
7. **And** a basic CI pipeline (GitHub Actions) runs linting on PRs

### Story 0.1: Common Module Setup

As a Lead Architect,
I want to initialize the `common` module with shared utilities and base guidelines,
So that other modules can reuse code without duplication or circular dependencies.

**Acceptance Criteria:**
1. **Given** the backend `src/common` directory
2. **When** I initialize the folder structure
3. **Then** it must contain `README.md` defining what belongs here (Guards, Interceptors, Filters, Pipes)
4. **And** it must contain `AGENTS.md` with strict rules: "NEVER import from other domain modules; Common is a leaf node in dependency graph."
5. **And** I create the initial `GlobalExceptionFilter` and `ResponseInterceptor` as defined in `05-IMPLEMENTATION-PATTERNS.md`

### Story 0.2: Auth Module Setup

As a Lead Architect,
I want to initialize the `auth` module with its structure and rules,
So that user management is isolated and secure.

**Acceptance Criteria:**
1. **Given** the backend `src/auth` directory
2. **When** I create the folder structure
3. **Then** it must contain `README.md` describing the JWT flow and User entity ownership
4. **And** it must contain `AGENTS.md` specifying: "Auth depends ONLY on Common. Do not import Memories or Social."

### Story 0.3: Media Module Setup

As a Lead Architect,
I want to initialize the `media` module,
So that file handling logic is centralized and decoupled from business logic.

**Acceptance Criteria:**
1. **Given** the backend `src/media` directory
2. **When** I create the folder structure
3. **Then** it must contain `README.md` documenting the S3 streaming and Sharp.js pipeline
4. **And** it must contain `AGENTS.md` specifying: "Media is a service provider. It does not know about Users or Memories."

### Story 0.4: Memories Module Setup

As a Lead Architect,
I want to initialize the `memories` module,
So that the core domain logic has a dedicated home.

**Acceptance Criteria:**
1. **Given** the backend `src/memories` directory
2. **When** I create the folder structure
3. **Then** it must contain `README.md` defining the Memory entity and PostGIS requirements
4. **And** it must contain `AGENTS.md` specifying: "Memories depends on Auth and Media. It is the source of truth for the Map."

### Story 0.5: Postcards Module Setup

As a Lead Architect,
I want to initialize the `postcards` module as a top-level domain,
So that time-locked logic is not buried within social features.

**Acceptance Criteria:**
1. **Given** the backend `src/postcards` directory
2. **When** I create the folder structure
3. **Then** it must contain `README.md` explaining the "Locked" vs "Unlocked" state machine
4. **And** it must contain `AGENTS.md` specifying: "Postcards depends on Auth and Media. Independent of Memories module."

### Story 0.6: Social Module Setup

As a Lead Architect,
I want to initialize the `social` module with subdomains for feed and discovery,
So that social interactions are organized by subdomain.

**Acceptance Criteria:**
1. **Given** the backend `src/social` directory
2. **When** I create the folder structure with `feed`, `posts`, and `discovery` subdirectories
3. **Then** it must contain `README.md` explaining the subdomain split
4. **And** it must contain `AGENTS.md` specifying: "Social depends on Auth and Media. Avoid circular deps with Memories (refer by ID only if possible)."

### Story 0.7: Moderation Module Setup

As a Lead Architect,
I want to initialize the `moderation` module,
So that safety tools are centralized.

**Acceptance Criteria:**
1. **Given** the backend `src/moderation` directory
2. **When** I create the folder structure
3. **Then** it must contain `README.md` documenting the reporting workflow
4. **And** it must contain `AGENTS.md` specifying: "Moderation consumes events from other modules. It has Moderator-only guards."

### Story 0.8: Admin Module Setup

As a Lead Architect,
I want to initialize the `admin` module,
So that system-wide management is isolated from user facing features.

**Acceptance Criteria:**
1. **Given** the backend `src/admin` directory
2. **When** I create the folder structure
3. **Then** it must contain `README.md` documenting RBAC requirements (Role='Admin')
4. **And** it must contain `AGENTS.md` specifying: "Admin has highest privilege. Can import any module service for monitoring."

## Epic 1: Authentication & Profiles

Enable users to create secure accounts, log in, and manage their basic profile and privacy settings so they have a trusted personal space for memories and social activity.

### Story 1.1: User Registration and Login with Email/Password

As a new or returning user,
I want to create an account or log in using my email and a secure password,
So that I can access my personal memory space.

**Acceptance Criteria:**

**Given** I am on the auth page
**When** I register with a valid email/password OR log in with existing credentials
**Then** the system creates/verifies the user record and establishes a secure session
**And** I am redirected to the onboarding flow (new user) or map (returning user)

### Story 1.2: 3rd Party Authentication (Google/OAuth)

As a user who prefers convenience,
I want to sign up or log in using my Google account or other 3rd party providers,
So that I don't have to remember another password.

**Acceptance Criteria:**

**Given** I am on the auth page
**When** I select "Sign in with Google" (or other supported provider) and complete the OAuth flow
**Then** the system links the provider ID to a user record (creating one if necessary)
**And** I am successfully authenticated and logged into the platform

### Story 1.3: Basic Profile Management

As a registered user,
I want to set my display name and upload an avatar,
So that my presence on the platform feels personal.

**Acceptance Criteria:**

**Given** I am logged in
**When** I update my display name or upload an avatar image in settings
**Then** the changes are saved and reflected across the UI
**And** media is served via the configured CDN

### Story 1.4: Privacy and Account Settings

As a private individual,
I want to manage my default privacy level and have the right to be forgotten,
So that I have full control over my data.

**Acceptance Criteria:**

**Given** I am logged in
**When** I set my default privacy (Private/Friends/Public)
**Then** future memories respect the new default

**Given** I choose to delete my account
**When** I confirm the destructive action
**Then** the system performs a "Soft Delete" on database records (setting `deleted_at` timestamp)
**And** schedules a "Hard Delete" job for S3 assets (images/audio) after 30 days
**And** creates an audit log entry for the deletion request

## Epic 2: Core Memory Capture & Map

Allow users to capture intimate Voice Sticker memories tied to locations and photos, and explore them on a beautiful, map-first interface with a contextual filmstrip.

### Story 2.1: One-Tap Voice Sticker Capture

As a user on the go,
I want to record a 3-second voice clip with a single tap,
So that I can capture the raw "vibe" of a place without the pressure of writing.

**Acceptance Criteria:**

**Given** I am on the map view
**When** I tap and hold the record button
**Then** the system records audio and stops automatically at 5 seconds
**And** the audio is saved as a Voice Sticker (AAC/Opus) and anchored to my current GPS location

### Story 2.2: Photo Upload with EXIF Location Extraction

As a traveler,
I want to upload a photo and have the app automatically place it on the map using its EXIF data,
So that I don't have to manually search for the location.

**Acceptance Criteria:**

**Given** I select a photo to upload
**When** the system detects GPS coordinates and a timestamp in the EXIF metadata
**Then** it suggests the location and time for the new memory pin
**And** I can confirm or adjust the location before the pin is saved to the map

### Story 2.3: Manual Pin Placement and Feeling-First Pins

As a user without a photo,
I want to drop a pin on the map and add a voice sticker,
So that I can record a memory that is purely emotional or atmospheric.

**Acceptance Criteria:**

**Given** I am looking at the map
**When** I long-press on a specific location
**Then** a new pin is created at that coordinate
**And** if no photo is provided, the system generates a beautiful abstract placeholder based on my selected "feeling" and the time of day

### Story 2.4a: Map Viewport Logic

As a user exploring my history,
I want to see my memories as pins on a map that update as I move,
So that I can find memories relevant to where I am looking.

**Acceptance Criteria:**

**Given** I am panning or zooming the map
**When** the map movement stops (debounce)
**Then** the system calculates the visible bounding box (NE/SW corners)
**And** requests memories within that box from the backend (`GET /memories/map?bbox=...`)
**And** renders pins for the returned memories at their precise GPS coordinates

### Story 2.4b: Filmstrip Rendering

As a user browsing the map,
I want to see a filmstrip of thumbnails for the visible pins,
So that I can preview the visual content without clicking every pin.

**Acceptance Criteria:**

**Given** the Map Viewport Logic (Story 2.4a) has updated the list of visible memories
**When** the memory list changes
**Then** the "Memory Filmstrip" updates dynamically to show thumbnails of those memories
**And** clicking a filmstrip item centers the map on that specific pin and triggers its Voice Sticker
**And** the filmstrip handles cases with large numbers of pins (e.g., virtualization or pagination)

## Epic 3: Onboarding & Bulk Import

Help new users quickly populate their map and understand the product’s emotional purpose through feeling-first onboarding and bulk import of past photos.

### Story 3.1: Emotional Onboarding Flow

As a first-time user,
I want to be asked a meaningful question (e.g., "Where did you feel most at home last year?") instead of a technical setup,
So that I immediately understand the emotional purpose of the app.

**Acceptance Criteria:**

**Given** I have just registered and logged in for the first time
**When** the onboarding flow starts
**Then** I am presented with a text prompt asking about a significant past location or feeling
**And** the system guides me to create my first pin based on that memory

### Story 3.2: Bulk-Drop Wall for Historical Import

As a new user with a large camera roll,
I want to drag and drop a folder of photos onto the web app,
So that I can quickly populate my life map with historical context.

**Acceptance Criteria:**

**Given** I am on the "Bulk-Drop Wall" page (Web only)
**When** I drag and drop a selection of photos or a folder into the upload area
**Then** the system processes the files and extracts EXIF metadata (location, timestamp) for each
**And** it displays a preview of the detected memories before final saving

### Story 3.3: EXIF Clustering and Batch Annotation

As a user importing many photos,
I want the system to group them by location and time,
So that I can easily add Voice Stickers to clusters of memories.

**Acceptance Criteria:**

**Given** I have uploaded a batch of photos
**When** the system detects photos taken at the same place and time (Memory Clusters)
**Then** it groups them together in the UI
**And** I can record a single Voice Sticker to provide emotional context for the entire cluster

## Epic 4: Rediscovery & Time-Locked Postcards

Let users rediscover past versions of themselves via Teleport and receive time-locked postcards that unlock on revisit or at a scheduled time, making memories feel like gifts.

### Story 4.1: Serendipitous Teleportation

As a "nostalgic nomad,"
I want to click a "Teleport" button and be jumped to a random past memory,
So that I can experience a "shiver" of self-recognition from a forgotten moment.

**Acceptance Criteria:**

**Given** I have existing memory pins on my map
**When** I click the "Teleport" button
**Then** the UI triggers a 0.2s shutter flash animation
**And** the map centers on a random, non-repeating pin
**And** the associated Voice Sticker plays automatically upon arrival

### Story 4.2: Creating Time-locked Postcards

As a user who wants to capture intention,
I want to send a photo-letter to my future self or a friend that opens when I return or on a specific date,
So the memory feels like a gift.

**Acceptance Criteria:**

**Given** I am creating a new memory or editing an existing one
**When** I select the "Create Postcard" option
**Then** I can specify an unlock condition: a future Date OR a Revisit Location
**And** I can select a recipient (Self or a Trusted Friend)
**And** the postcard is saved in a "Locked" state

### Story 4.3: Postcard Unlock and Delivery

As a recipient of a postcard,
I want to be notified when a memory has unlocked,
So that I can relive that moment at the right time.

**Acceptance Criteria:**

**Given** I have a locked postcard waiting for me
**When** the unlock condition is met (the date arrives or I enter the GPS geofence of the location)
**Then** the system transitions the postcard to an "Unlocked" state
**And** I receive a notification to view the content
**And** the full photo and message are revealed upon opening

## Epic 5: Social Posting, Feed & Discovery

Allow users to publish rich posts, browse a personalized feed, explore recommended content, and search across the network to extend engagement beyond purely private memories.

### Story 5.1: Creating Rich Social Posts

As a user,
I want to create a post with text, hashtags, and multiple images or Voice Stickers,
So that I can share my experiences with my community.

**Acceptance Criteria:**

**Given** I am on the "Create Post" screen
**When** I enter text, add hashtags, and upload one or more images/audio clips
**Then** the system creates a new post record linked to my profile
**And** I can set the privacy level (Public/Friends) for the post

### Story 5.2: Multi-Image Upload and Captions

As a user sharing a gallery,
I want to upload multiple images at once and add a caption to each,
So that I can tell a detailed story.

**Acceptance Criteria:**

**Given** I am adding images to a post
**When** I select multiple files for upload
**Then** the system allows me to reorder them and add a unique description/caption to each image
**And** all images are processed and stored with their respective metadata

### Story 5.3: Personalized Following Feed

As a social user,
I want to see a feed of recent posts from people I follow,
So that I can stay connected with their lives.

**Acceptance Criteria:**

**Given** I am on the "Feed" tab
**When** the page loads
**Then** the system retrieves and displays posts from users in my "Following" list, sorted by recency
**And** I can see the text, media, and interaction counts (likes/comments) for each post

### Story 5.4: Explore and Search

As a curious user,
I want to discover new content and search for specific hashtags or people,
So that I can expand my network.

**Acceptance Criteria:**

**Given** I am on the "Explore" tab or using the search bar
**When** I enter a search query (hashtag, username, or keyword) or browse recommended content
**Then** the system returns relevant public posts and user profiles
**And** I can navigate to a post or profile from the search results

## Epic 6: Social Graph & Interactions

Support lightweight social relationships and interactions (follow, like, comment) that layer social connection on top of personal memories without forcing performance pressure.

### Story 6.1: Following and Unfollowing Users

As a user,
I want to follow other users,
So that I can see their updates in my feed.

**Acceptance Criteria:**

**Given** I am on another user's profile
**When** I click the "Follow" button
**Then** the system updates my following list and their followers list
**And** their future posts appear in my personalized feed

### Story 6.2: Liking Posts and Images

As a user,
I want to like a post or image,
So that I can show appreciation for the content.

**Acceptance Criteria:**

**Given** I am viewing a post or image
**When** I click the "Like" button
**Then** the like count for that item increases
**And** the author of the post receives a notification

### Story 6.3: Commenting on Posts

As a user,
I want to comment on a post,
So that I can engage in conversation with the author and other users.

**Acceptance Criteria:**

**Given** I am viewing a post
**When** I submit a text comment
**Then** the comment is displayed in the post's comment thread
**And** the author is notified of the new interaction

## Epic 7: Reporting & Content Moderation

Provide a safe environment by enabling users to report harmful content and giving moderators effective tools to review and enforce community standards.

### Story 7.1: Reporting Violations

As a user,
I want to report a post, comment, or account,
So that I can help keep the community safe and healthy.

**Acceptance Criteria:**

**Given** I see content that violates community standards
**When** I click "Report" and select a reason (e.g., spam, harassment, inappropriate content)
**Then** a report is created in the system for moderator review
**And** I receive a confirmation that my report has been submitted

### Story 7.2: Moderator Post Review

As a moderator,
I want to review reported posts,
So that I can take action on policy violations.

**Acceptance Criteria:**

**Given** I am logged in with moderator privileges and accessing the moderator dashboard
**When** I review a reported post
**Then** I can choose to approve the post, hide it from public view, or permanently delete it
**And** the system logs my action for audit purposes

### Story 7.3: Moderator Comment Review

As a moderator,
I want to moderate comments,
So that I can maintain a healthy discussion environment.

**Acceptance Criteria:**

**Given** I am reviewing reported comments in the dashboard
**When** I take action on a comment
**Then** I can hide, delete, or lock the comment thread to prevent further interaction
**And** the user who posted the comment is notified if their content is removed

## Epic 8: Admin, Roles & Observability

Give administrators control over user accounts, roles, and system health so the platform can be operated, monitored, and evolved safely and reliably.

### Story 8.1: Admin User and Role Management

As an administrator,
I want to manage user accounts and assign roles,
So that I can control access and delegate moderation tasks.

**Acceptance Criteria:**

**Given** I am in the admin management console
**When** I select a user account
**Then** I can lock or unlock the account
**And** I can assign or revoke the "Moderator" role for that user

### Story 8.2: System Monitoring and Statistics

As an administrator,
I want to see system-wide statistics and logs,
So that I can monitor the health and growth of the platform.

**Acceptance Criteria:**

**Given** I am in the admin dashboard
**When** I view the system statistics page
**Then** I see real-time or near-real-time counts for active users, total posts, and system performance metrics
**And** I can access system logs for troubleshooting

### Story 8.3: Admin Report and Complaint Management

As an administrator,
I want to manage high-level reports and complaints,
So that I can resolve complex disputes or appeals.

**Acceptance Criteria:**

**Given** I am reviewing the queue of reports and complaints
**When** I classify and resolve a specific case
**Then** the system records the resolution details
**And** the involved parties are notified of the outcome if applicable

---
title: "Project Context Analysis"
project: "se122-image-sharing-social-media"
date: "2025-12-19"
status: "Complete"
---

# Project Context Analysis

> **Navigation:** See [INDEX](00-INDEX.md) for the complete architecture guide.

## Requirements Overview

**Functional Requirements (FRs)**

Architecturally, the core functional scope spans:

- **Core Memory Capture & Map (FR1–FR7)**

  - Voice Sticker capture (2–5s audio) as the atomic memory unit, attached to a geographic pin and optional photo.
  - Automatic EXIF-based placement of uploaded photos on the map, with user-adjustable positions.
  - Manual pin placement and "feeling-first" entries, including voice-only pins with generative placeholders.
  - A Living Map experience that must efficiently render and query many pins, plus a contextual memory filmstrip bound to the current viewport.

- **Onboarding & Bulk Import (FR8–FR9) — Lite Approach**

  - Bulk import of historical photos with automatic EXIF-based placement.
  - Missing or corrupted EXIF data results in placement in the "Cloud of Unknowing" (aggregated, non-interactive visual element).
  - **No Review & Repair UI in V1.** Import is a utility, not a polished feature. Extraction is a necessary tax to reach the magic.

- **Rediscovery & Time-Locked Postcards (FR6, FR10–FR11)**

  - Teleport feature that selects non-repeating memories, drives the map to them, and plays audio with a brief transition/shutter effect.
  - Time-locked postcards that remain locked until a time or location condition is met and then unlock for the intended recipient (self or trusted friend).

- **Account, Social, and Discovery Layer (FR12–FR24)**

  - Authentication and basic profile management, including privacy defaults.
  - Rich post creation (text, tags, images, Voice Stickers), multi-image support, edit/delete.
  - Personalized feed, Explore/recommendations, and search across posts, photos, hashtags, and users.
  - Social interactions: follow/unfollow, likes, comments, and sharing.

- **Safety, Moderation, and Admin (FR25–FR30)**
  - End-user reporting of content and accounts.
  - Moderator tools for reviewing and acting on reported content (posts, images, comments).
  - Admin console for managing users, roles (User/Moderator/Admin), and system-level observability (usage, performance, logs, and report queues).

**Non-Functional Requirements (NFRs)**

NFRs that will strongly shape the architecture:

- **Privacy & Data Sovereignty**

  - Private-by-default memories and granular controls (Private/Friends/Public).
  - Right-to-be-forgotten: account deletion must cascade to all associated media and metadata.
  - Easy export of all user data in a portable format.

- **Performance & UX Quality**

  - Map interactions under ~200ms, implying efficient spatial querying and caching.
  - Fast playback for short audio clips, with normalized volume and low-latency delivery.
  - Web-first PWA experience that feels app-like on both desktop and mobile browsers.

- **Storage & Data Design**

  - S3-compatible object storage with CDN for media.
  - PostgreSQL with PostGIS for geographic queries, with a structured Memory Pin model (location, media, content, privacy, unlock conditions).
  - Image and audio processing pipelines (thumbnailing, EXIF handling, format conversion).

- **Security, Compliance, and Safety**
  - Encryption in transit/at rest and careful handling of geolocation data.
  - Moderation, NSFW filtering, and geo-safety heuristics (e.g., sensitive locations).
  - Role-based access control and auditable admin/moderator actions.

**Scale & Complexity**

- **Primary domain:** Full-stack web / PWA with media-heavy, map-centric UX.
- **Complexity level:** Medium-to-high. Reasons include:
  - Multiple feature clusters (core memory, bulk import, postcards, social, moderation, admin).
  - Geo-indexed data with spatial queries and performance constraints.
  - Media upload/processing pipeline and CDN-backed delivery.
  - Cross-cutting privacy, safety, and export requirements.
- **Estimated architectural components (high level):**
  - Web client (PWA) with map/teleport, capture, feed, and admin UIs.
  - Backend API (auth, memories, postcards, social graph, moderation, admin, exports).
  - Media storage and processing services.
  - Database (PostgreSQL + PostGIS) and search/query layer.
  - Observability/monitoring stack.

## Technical Constraints & Dependencies

Known constraints and implied dependencies:

- **Web-first technology selection:** The initial implementation must prioritize browser-based UX (desktop + mobile) before any native apps.
- **Database:** PostgreSQL with PostGIS, chosen to support spatial queries (bounding boxes, nearby searches).
- **Object storage & CDN:** S3-compatible storage with a CDN for efficient delivery of photos, thumbnails, and short audio clips.
- **Audio & image handling:**
  - Voice Stickers in AAC/Opus with duration limits and volume normalization.
  - Image formats (JPEG/HEIC/WebP) with server-side conversion and multi-resolution variants.
- **RBAC:** Clear separation between User, Moderator, and Admin capabilities must be enforced consistently at the API and UI layers.
- **Export & deletion guarantees:** APIs and data model must support full account deletion and complete data export without leaving orphaned media.

## Cross-Cutting Concerns Identified

These concerns will affect multiple parts of the architecture:

- **Authentication & Authorization:** Session management, token handling, and role-aware authorization across all APIs (memories, social, moderation, admin).
- **Privacy & Sharing Model:** Consistent enforcement of visibility rules in queries, feeds, map views, search, and exports.
- **Geo-Safety & Sensitive Locations:** Centralized rules for redaction, warnings, and restricted areas that apply to capture, display, and sharing flows.
- **Content Moderation Pipeline:** Shared moderation workflows (queues, actions, audit logs) used by reports from many surfaces.
- **Media Pipeline & CDN Integration:** Common handling for uploads, processing, storage, and signed/controlled delivery of media.
- **Telemetry & Observability:** Unified logging, metrics, and tracing to support admin dashboards and operational visibility.
- **PWA & Offline Behavior:** Level of offline support and caching strategy for map tiles, pins, and media previews (to be determined in later steps).

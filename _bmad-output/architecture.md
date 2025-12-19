---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - "./_bmad-output/project-prd_v1_2025-12-18T12-00-00Z.md"
  - "./_bmad-output/project-prd_v2_2025-12-19.md"
  - "./_bmad-output/epics.md"
  - "./_bmad-output/user-stories_2025-12-19.md"
  - "./_bmad-output/data-spec_2025-12-19.md"
workflowType: "architecture"
lastStep: 5
project_name: "se122-image-sharing-social-media"
user_name: "DELL"
date: "2025-12-19"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections will be appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

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

### Technical Constraints & Dependencies

Known constraints and implied dependencies:

- **Web-first technology selection:** The initial implementation must prioritize browser-based UX (desktop + mobile) before any native apps.
- **Database:** PostgreSQL with PostGIS, chosen to support spatial queries (bounding boxes, nearby searches).
- **Object storage & CDN:** S3-compatible storage with a CDN for efficient delivery of photos, thumbnails, and short audio clips.
- **Audio & image handling:**
  - Voice Stickers in AAC/Opus with duration limits and volume normalization.
  - Image formats (JPEG/HEIC/WebP) with server-side conversion and multi-resolution variants.
- **RBAC:** Clear separation between User, Moderator, and Admin capabilities must be enforced consistently at the API and UI layers.
- **Export & deletion guarantees:** APIs and data model must support full account deletion and complete data export without leaving orphaned media.

### Cross-Cutting Concerns Identified

These concerns will affect multiple parts of the architecture:

- **Authentication & Authorization:** Session management, token handling, and role-aware authorization across all APIs (memories, social, moderation, admin).
- **Privacy & Sharing Model:** Consistent enforcement of visibility rules in queries, feeds, map views, search, and exports.
- **Geo-Safety & Sensitive Locations:** Centralized rules for redaction, warnings, and restricted areas that apply to capture, display, and sharing flows.
- **Content Moderation Pipeline:** Shared moderation workflows (queues, actions, audit logs) used by reports from many surfaces.
- **Media Pipeline & CDN Integration:** Common handling for uploads, processing, storage, and signed/controlled delivery of media.
- **Telemetry & Observability:** Unified logging, metrics, and tracing to support admin dashboards and operational visibility.
- **PWA & Offline Behavior:** Level of offline support and caching strategy for map tiles, pins, and media previews (to be determined in later steps).

---

## Product Principles (Architectural Enforcement)

These principles are **not** design guidelines; they are architectural constraints that must be enforced at the API and data model layers:

1. **"Ship the Mirror, Not the Movers"**

   - Core product value derives from Voice Sticker capture + Teleport rediscovery, not from onboarding logistics.
   - Bulk import is a utility for V1, not a feature. No Review & Repair UI, no pending state surfaces, no operational expansion of the import flow.

2. **"Memories Gain Gravity Through Voice, Not Coordinates"**

   - When a user extracts a memory from the Cloud of Unknowing or creates a new memory without location, the **audio-first extraction rule** applies:
     - Do NOT prompt for location first.
     - Do NOT ask for metadata.
     - **Immediately prompt for voice.**
   - This semantic ordering reinforces that voice is the truth, location is the anchor.

3. **"Unplaced Memories Are Visually Acknowledged But Never Operationally Expanded"**
   - The Cloud of Unknowing exists as a visual affordance to reduce onboarding anxiety, not as a product surface or destination.
   - Hard rule: "The Cloud must never be a place you spend time."
   - See dedicated section below for strict behavioral constraints.

---

## Architecture Decision: The Cloud of Unknowing

### Purpose

- Reduce onboarding anxiety from bulk imports with missing or corrupted EXIF data.
- Preserve aesthetic coherence of the Locket experience.
- Avoid introducing repair or metadata-fixup workflows in V1.

### What the Cloud Is (Technical Definition)

A **single aggregated visual element** representing all unplaced memories:

- **Rendering model:**
  - Single aggregated entity (not N individual pins rendered).
  - SVG or canvas overlay with CSS blur / radial gradient aesthetic.
  - O(1) render cost regardless of import size.
- **Data model:**
  - Unplaced memories have `geo = null` and are excluded from PostGIS spatial index.
  - Tracked in the Memory Pin table but logically segregated.
- **Performance guarantee:**
  - No reflow tied to map pan/zoom operations.
  - No worker complexity; fully client-side aggregation.
  - Does not touch frame budget if kept aggregated.

### Explicit Non-Goals (What the Cloud Is NOT)

The Cloud of Unknowing is **explicitly not**:

- Browsable
- Sortable
- Editable
- Explorable beyond a single reveal gesture
- A product surface for future expansion

**Architectural enforcement:** Any feature work that attempts to expand the Cloud (e.g., "let users organize unplaced photos into categories") is **blocked by principle** and must be escalated as a new epic, not a modification to Epic 3.

### User Interaction Constraints (Hard Rules)

1. **One tap/click reveals a count and a single line of copy:**

   - Copy example: "10 memories waiting for location. Capture a voice to place one, or tap Teleport to rediscover."

2. **The only suggested next actions are:**

   - "Capture a voice to place one" (audio-first extraction rule applies).
   - "Teleport" (to the main magic loop).

3. **No scrolling. No grid. No dopamine.**
   - The Cloud does not become a secondary destination or reward mechanism.

### Stress-Test: Semantic Leakage Prevention

**The question answered:** Does the Cloud invite curiosity—or defer meaning indefinitely?

- **Desired outcome:** The Cloud becomes a psychological parking lot ("I'll deal with that later"), not a substitute destination.
- **Signal that we got it wrong:** Users spend meaningful time in the Cloud, or report that the Cloud is their primary interaction with imported photos.
- **Telemetry to track:** Time spent viewing the Cloud reveal, frequency of accessing vs. Teleporting, and whether users extract from the Cloud vs. creating new Voice Stickers. If Cloud extraction becomes >30% of voice entry points, the semantic framing has failed.

---

## Audio-First Extraction Rule (Locked for V1)

When a user pulls a memory out of the Cloud or creates a new memory without an existing location:

**Flow (in order):**

1. Display the memory (photo or generative placeholder if voice-only).
2. **Immediately prompt: "Add a voice to anchor this memory."**
3. Only after voice is recorded: offer location confirmation/adjustment (if EXIF exists) or manual placement.

**Why this order matters architecturally:**

- Reinforces that **voice is the semantic anchor**, not location.
- Ensures every memory has a voice clip (or empty voice state), which is required for Teleport playback.
- Prevents the flow from devolving into a metadata fixup form.
- Defaults the user behavior toward the core product value.

**API implication:** The `POST /api/memories/upload` endpoint must support:

- Photo + metadata first.
- Voice added in a follow-up PATCH or separate `POST /api/memories/:id/voice`.
- Status progression: `draft` (no voice) → `published` (has voice, may have location).

---

## Decision Summary

✅ **Approved:** Cloud of Unknowing as a constrained, non-interactive system element.  
✅ **Locked:** Audio-first extraction rule for unplaced memories.  
✅ **Enforced:** Product principles block future semantic expansion of the Cloud.  
✅ **Telemetry:** Defined success metrics to detect semantic leakage.

**Roadmap Impact:**

- Epic 3 (Bulk Import Lite) scope reduced; no Review & Repair UI.
- Reclaimed ~2 weeks of dev/QA time, redirected to Teleport and Voice latency optimization.
- Unplaced memory state (`geo = null`) requires only a database schema addition and aggregate rendering logic, not a UI surface.

---

## Starter Template Evaluation

### Primary Technology Domain

**Cross-platform mobile-first with web support (React Native/Expo) + TypeScript backend (NestJS)**

Given the requirement for a PWA-first experience that works on web, iOS, and Android, we're using:

- **Frontend:** Expo (React Native) with file-based routing and universal exports
- **Backend:** NestJS with Express or Fastify HTTP adapter

### Starter Options Considered & Selected

#### Frontend: Expo with Expo Router

**Why Expo (already initialized in your project):**

- Unified codebase: Write once, runs on iOS, Android, and web
- Expo Router provides file-based routing (like Next.js) with seamless URL support
- Built-in support for camera, geolocation, audio recording—critical for Voice Sticker and EXIF capture
- Excellent developer experience with hot reload and over-the-air updates via EAS
- Strong PWA support via `expo-web` export
- Mature ecosystem with 60K+ community members

**Current Version Installed:**

- Expo: `~54.0.30`
- React Native: `0.81.5`
- Expo Router: `~6.0.21`
- React: `19.1.0`

**Initialization Command (already done in your project):**

```bash
npx create-expo-app@latest --template
# or for existing projects:
npx expo install expo-router
```

**Architectural Decisions Provided by Expo Starter:**

- **File-based routing:** All screens defined in `app/` directory with automatic route generation
- **Cross-platform components:** Shared React Native components compile to native (iOS/Android) and web
- **Navigation:** Expo Router handles native stack and web browser navigation seamlessly
- **Styling:** React Native StyleSheet + platform-specific overrides; supports TailwindCSS via `nativewind`
- **State management:** Ready for Redux, Zustand, Context API (not enforced by starter)
- **Build tooling:** Expo CLI handles bundling for all platforms; no manual Webpack configuration needed
- **Development workflow:** `expo start` launches a dev server that hot-reloads across all platforms
- **Asset management:** Static assets in `assets/` auto-linked; images optimized per platform
- **Testing:** ESLint + TypeScript configured; Jest setup available via EAS

**Why This Matters for Life Mapped:**

- The **Living Map** component renders identically on mobile and web, reducing UI debt
- **Voice Sticker recording** uses native audio APIs (iOS AVFoundation, Android MediaRecorder) via `expo-av`
- **EXIF extraction** in the browser via `expo-media-library` for bulk imports
- **Map rendering** with `react-native-maps` (Expo-compatible) handles spatial queries efficiently
- **Teleport transition** animations use `react-native-reanimated` (pre-configured) for the 0.2s shutter effect

---

#### Backend: NestJS

**Why NestJS:**

- Enterprise-grade Node.js framework with strong TypeScript support (required for consistency with frontend)
- Modular architecture (Controllers → Services → Repositories) aligns with clean architecture principles
- Built-in support for REST, GraphQL, WebSockets, and microservices
- Decorator-based dependency injection reduces boilerplate
- Excellent ORM integration (TypeORM, Prisma)
- Strong validation and serialization libraries (`class-validator`, `class-transformer`)
- Well-documented security practices (guards, pipes, interceptors for auth, rate-limiting, etc.)

**Current Version (to be installed):**

- NestJS: `^11.0.0` (latest, as of 2025)
- Node.js: `>= 20.x`
- TypeScript: `^5.x`

**Initialization Command:**

```bash
npm i -g @nestjs/cli
nest new life-mapped-backend --strict
```

**Architectural Decisions Provided by NestJS Starter:**

- **Project structure:** `src/` directory with modules, controllers, services, and entities
- **Dependency injection:** All dependencies resolved at application bootstrap; no singletons scattered around
- **HTTP adapter:** Express by default (can switch to Fastify for higher performance)
- **Database integration:** TypeORM configured with PostgreSQL (or other relational DBs)
- **Validation:** `class-validator` for DTO validation at API entry points
- **Error handling:** Global exception filters for consistent error responses
- **Logging:** Built-in logger service; configurable for production observability
- **Environment configuration:** `.env` file support via `@nestjs/config`
- **Testing:** Jest configured for unit and integration tests
- **Development workflow:** `npm run start:dev` watches files and hot-reloads
- **Build & deployment:** `npm run build` produces optimized `dist/` folder ready for production

**Why This Matters for Life Mapped:**

- **Modular architecture:** Separate modules for `MemoriesModule`, `PostcardsModule`, `SocialModule`, `ModerationModule`, `AdminModule`
- **Authentication:** Guards for role-based access control (User/Moderator/Admin)
- **Database queries:** Services layer abstracts PostGIS queries and spatial indexing
- **Media pipeline:** Interceptors handle large multi-part uploads (audio + photo) with streaming
- **Real-time updates:** WebSocket gateway for live notifications (postcard unlocks, follower activity)
- **Scalability:** Modular design allows easy extraction of services to microservices later (e.g., media processing)

---

## Technology Stack Summary

| Layer                     | Technology             | Version        | Decision Rationale                                                            |
| ------------------------- | ---------------------- | -------------- | ----------------------------------------------------------------------------- |
| **Frontend (Client)**     | Expo + React Native    | 54.x / 0.81.x  | Cross-platform with web export; Voice & camera APIs; file-based routing       |
| **Frontend (Web)**        | Expo Web Export        | 54.x           | Shared codebase; no separate Next.js needed; Expo handles web compilation     |
| **Backend (HTTP)**        | NestJS + Express       | 11.x           | TypeScript-first; modular; Guards for RBAC; DTO validation                    |
| **Backend (Optional)**    | Fastify adapter        | ~11.x          | Drop-in replacement for Express if performance optimization needed later      |
| **Database**              | PostgreSQL + PostGIS   | 15.x+          | Spatial queries for map; PostGIS extension for bounding-box & nearby searches |
| **ORM**                   | TypeORM or Prisma      | TBD            | Will decide in next step (both are excellent with PostGIS support)            |
| **Authentication**        | Auth.js / NextAuth.js  | TBD            | JWT + session support; integrates cleanly with NestJS Guards                  |
| **Object Storage**        | S3-compatible + CDN    | AWS S3 / Minio | For photos and audio; signed URLs for secure delivery                         |
| **Deployment (Frontend)** | EAS (Expo)             | ~latest        | Managed build service for iOS, Android, and web; zero-config                  |
| **Deployment (Backend)**  | Docker + Railway / AWS | ~TBD           | Containerized NestJS app; scale horizontally                                  |

---

## Architecture Decisions Locked by Starters

✅ **Frontend:**

- Universal cross-platform codebase (single source of truth for UI logic)
- File-based routing with native and web support
- Native OS APIs for camera, audio, geolocation (via Expo SDK)
- React Native StyleSheet for platform-specific styling

✅ **Backend:**

- Modular service architecture with dependency injection
- TypeScript as primary language (matches frontend)
- Guard-based role-based access control (User/Moderator/Admin)
- Global exception filters for consistent error handling
- DTO validation at API entry points

✅ **Consistency:**

- Both frontend and backend are TypeScript-first
- Both follow modular/component-based organization
- Both have hot-reload for rapid development
- Both include ESLint + Prettier for code quality

---

## Core Architectural Decisions

### Data Architecture

**Decision 1: ORM — TypeORM**

**Why TypeORM:**

- Native PostGIS support (`geography` column type without custom scalars)
- Direct integration with NestJS decorators (@Entity, @Column, @PrimaryGeneratedColumn)
- Repository pattern aligns with clean architecture
- Strong type safety from decorator-driven design

**Version:** `@nestjs/typeorm` ^10.0.0, `typeorm` ^0.3.19

**Impact:** All database queries use TypeORM repositories; entities are source of truth for schema.

---

**Decision 2: Caching Strategy — In-Memory (node-cache) for MVP, Redis upgrade path**

**Why node-cache for MVP:**

- Living Map queries (pins within bounding box) benefit massively from viewport caching
- Zero operational overhead; no external service to manage
- Easy upgrade path: wrap cache in abstract `CacheService`, swap implementation to Redis later
- Sufficient for single-server deployment

**Upgrade trigger:** When deploying to multiple servers or load exceeds single server capacity, switch to Redis.

**Implementation:**

```typescript
// src/cache/cache.service.ts
@Injectable()
export class CacheService {
  private cache = new NodeCache({ stdTTL: 300 });

  get(key: string) {
    return this.cache.get(key);
  }
  set(key: string, value: any, ttl?: number) {
    this.cache.set(key, value, ttl);
  }
}
```

---

**Decision 3: Spatial Indexing — GiST on location column**

**SQL:**

```sql
CREATE INDEX idx_memory_location ON memories USING GIST(location);
CREATE INDEX idx_memory_userid_timestamp ON memories(user_id, timestamp);
```

**Why GiST:**

- Fast `ST_DWithin` queries (find nearby memories)
- Fast bounding-box queries (Living Map viewport rendering)
- PostGIS standard for spatial indexes

---

### Authentication & Security

**Decision 4: Authentication — JWT Access Token + Refresh Token (HttpOnly Cookie)**

**Flow:**

```
POST /auth/login
  ↓
Backend creates:
  - accessToken (JWT, 15-min expiry, signed with secret)
  - refreshToken (random token, 7-day expiry, stored in DB)
  ↓
Response:
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": "uuid", "email": "...", "role": "user" }
  }
  + Set-Cookie: refreshToken=abc123def456 (HttpOnly, Secure, SameSite=Strict)
```

**Why JWT + Refresh Tokens:**

- **Stateless API:** No session store needed; scales horizontally
- **Mobile-friendly:** Expo apps store JWT in `expo-secure-store`
- **Easy revocation:** Delete refresh token from DB to logout
- **Role changes take effect:** On next token refresh, new roles are issued

**Refresh flow:**

```
POST /auth/refresh (with refreshToken in cookie)
  ↓
Backend validates refreshToken in DB
  ↓
Respond with new accessToken
```

**Logout flow:**

```
POST /auth/logout (with refreshToken in cookie)
  ↓
Backend deletes refreshToken from DB
  ↓
Frontend clears local accessToken
  ↓
User is logged out
```

---

**Decision 5: RBAC — Three-Role Model (User / Moderator / Admin)**

**Roles & Permissions:**

| Role          | Capabilities                                                                    |
| ------------- | ------------------------------------------------------------------------------- |
| **User**      | Create memories, post, follow, like, comment, report                            |
| **Moderator** | Review reports, hide/delete posts, lock comments, view all reports              |
| **Admin**     | Manage users, assign roles, system monitoring, triage reports, view system logs |

**Implementation:**

```typescript
// src/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Usage:
@UseGuards(AuthGuard, RolesGuard)
@Roles('Moderator', 'Admin')
@Get('admin/reports')
async getReports() { ... }
```

---

**Decision 6: Encryption — TLS 1.3 (in-transit) + Provider-managed at-rest**

**Why delegated encryption:**

- All API traffic over HTTPS (TLS 1.3)
- Database encryption at rest handled by managed provider (Heroku Postgres, Railway, AWS RDS all include this)
- EXIF data and geolocation encrypted by default at provider level
- No performance overhead; encryption is transparent

---

### API & Communication

**Decision 7: API Design — REST + OpenAPI/Swagger**

**Why REST (not GraphQL):**

- Life Mapped's data access patterns are simple: fetch memories by location/user, fetch posts by user, fetch feed
- No complex nested queries or N+1 problems that GraphQL solves
- REST endpoints naturally mirror epic structure
- Simpler caching strategy (HTTP cache headers)

**Top-Level API Routes:**

```
POST   /auth/register              Create account
POST   /auth/login                 Login with email/password
POST   /auth/login/google          OAuth login
POST   /auth/refresh               Refresh access token
POST   /auth/logout                Logout (invalidate refresh token)
GET    /auth/profile               Get current user profile
PATCH  /auth/profile               Update profile (name, avatar, privacy)

POST   /memories                   Create new memory (photo + voice)
GET    /memories                   List user's memories (paginated)
GET    /memories/map               Query memories in bounding box (for map)
GET    /memories/:id               Get single memory details
GET    /memories/teleport          Get random non-repeating memory for Teleport
POST   /memories/bulk-import       Bulk import photos (returns pending list)
PATCH  /memories/:id               Edit memory metadata (location, notes)
DELETE /memories/:id               Delete memory

POST   /postcards                  Create time-locked postcard
GET    /postcards                  List user's postcards (sent & received)
GET    /postcards/:id              Get postcard details
POST   /postcards/:id/unlock       Unlock postcard (if condition met)
DELETE /postcards/:id              Delete postcard

POST   /social/posts               Create post (text + media)
GET    /social/feed                Get personalized feed
GET    /social/explore             Get recommended posts
GET    /social/search              Search posts & users
PATCH  /social/posts/:id           Edit post (caption, tags, privacy)
DELETE /social/posts/:id           Delete post
POST   /social/posts/:id/like      Like a post
DELETE /social/posts/:id/like      Unlike a post
POST   /social/posts/:id/comment   Add comment
DELETE /social/posts/:id/comment/:commentId  Delete comment
POST   /social/posts/:id/share     Share a post
POST   /social/follow/:userId      Follow a user
DELETE /social/follow/:userId      Unfollow a user

POST   /reports                    Report post/comment/user
GET    /reports                    List user's reports
GET    /admin/reports              List all reports (Admin/Mod only)
PATCH  /admin/reports/:id          Take action on report (hide/delete/restore)

GET    /admin/users                List all users
PATCH  /admin/users/:id            Update user (role, status)
GET    /admin/monitoring           System stats (user count, post count, etc.)
```

---

**Decision 8: API Documentation — NestJS Swagger (auto-generated)**

**Why auto-generation:**

- Zero maintenance; docs always match code
- Interactive API explorer at `/api-docs`
- OpenAPI spec automatically generated for client SDK generation

**Setup:**

```bash
npm install @nestjs/swagger swagger-ui-express
```

```typescript
// src/main.ts
const config = new DocumentBuilder()
  .setTitle("Life Mapped API")
  .setDescription("Memory preservation and rediscovery")
  .setVersion("1.0")
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup("api-docs", app, document);
```

---

**Decision 9: Error Handling — Global Exception Filters + HTTP Status Codes**

**Standard Response Envelope:**

```json
{
  "statusCode": 400,
  "message": "Invalid EXIF data in uploaded photos",
  "error": "BadRequestException",
  "timestamp": "2025-12-19T10:30:45Z",
  "path": "/memories/bulk-import"
}
```

**HTTP Status Codes:**

- `200 OK` — Success
- `201 Created` — Resource created
- `400 Bad Request` — Invalid input (validation failed)
- `401 Unauthorized` — Authentication required
- `403 Forbidden` — Authenticated but no permission
- `404 Not Found` — Resource not found
- `409 Conflict` — Resource already exists or conflict
- `429 Too Many Requests` — Rate limited
- `500 Internal Server Error` — Server error

---

### Media Pipeline

**Decision 10: Media Upload — Streaming directly to S3 (no server buffering)**

**Why streaming:**

- Bulk-Drop Wall may receive 100s of large photos; buffering on server wastes memory
- Stream directly from client to S3; server never touches disk
- Scales horizontally; each server is stateless

**Implementation:**

```typescript
@Post('memories/upload')
@UseInterceptors(FileInterceptor('photo', { storage: s3Storage }))
async uploadPhoto(@UploadedFile() photo, @UploadedFile() audio) {
  // photo and audio stream directly to S3
  return { photoUrl: photo.location, audioUrl: audio.location };
}
```

---

**Decision 11: Image Processing — Sharp.js for thumbnails and display variants**

**Why Sharp:**

- Pure JavaScript; no system dependencies (critical for serverless/containerized deployments)
- Fast; uses libvips under the hood
- Generates multiple sizes on-demand and caches in S3

**Process:**

```
User uploads 4K photo
  ↓
Store as: s3://bucket/photos/original/abc123.jpg
  ↓
First request for display size:
  → Sharp resizes to 1080p
  → Store as: s3://bucket/photos/display/abc123_1080p.jpg
  → Return URL
  ↓
First request for thumbnail:
  → Sharp resizes to 300x300
  → Store as: s3://bucket/photos/thumb/abc123_300x300.jpg
  → Return URL
```

---

**Decision 12: Audio Processing — Volume normalization + duration validation**

**Why normalization:**

- Voice Stickers (2–5s audio) must have consistent volume for predictable playback during Teleport
- Prevents audio-heavy memories from drowning out others
- Uses FFmpeg via `fluent-ffmpeg` npm package

**Process:**

```
User records Voice Sticker (raw audio)
  ↓
FFmpeg:
  - Validate duration (1–5 seconds)
  - Normalize to -20dB peak level
  - Convert to AAC/m4a or Opus/webm
  ↓
Store in S3 with cache headers
```

---

**Decision 13: Real-Time Notifications — WebSocket Gateway**

**Why WebSockets:**

- When a postcard unlocks, user sees it immediately (not on next poll)
- When a user follows the current user, real-time notification
- Fallback to polling for disconnects

**Implementation:**

```typescript
@WebSocketGateway()
export class NotificationsGateway {
  @SubscribeMessage('subscribe')
  onSubscribe(client: Socket, @MessageBody() userId: string) {
    client.join(userId); // join room named after user ID
  }

  broadcastPostcardUnlock(recipientId: string, postcardData: any) {
    this.server.to(recipientId).emit('postcard:unlocked', postcardData);
  }
}

// Emitting from controller:
@Post('postcards/:id/unlock')
async unlockPostcard(@Param('id') postcardId: string) {
  const postcard = await this.poscardsService.unlock(postcardId);
  this.notificationsGateway.broadcastPostcardUnlock(
    postcard.recipientId,
    postcard
  );
  return postcard;
}
```

---

**Decision 14: Rate Limiting — Token bucket per user, per endpoint**

**Why rate limiting:**

- Prevent abuse: file upload spam, memory creation floods, brute-force attacks
- Different limits per endpoint based on risk

**Limits:**

- General endpoints: 100 requests/minute per user
- Memory uploads: 10 requests/minute per user
- Bulk imports: 1 request/minute per user
- Auth endpoints: 5 failed login attempts before temporary lockout

**Implementation:**

```bash
npm install @nestjs/throttler
```

```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Get('memories')
async listMemories() { ... }

@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('memories')
async createMemory() { ... }
```

---

### Infrastructure & Deployment

**Decision 15: Backend Deployment — Docker container on managed platform**

**Why containerization:**

- Reproducible: same Dockerfile builds locally and in production
- Scalable: orchestrator (Kubernetes, Docker Swarm) can replicate containers
- Zero-downtime deployments: Blue-Green or Rolling updates

**Supported platforms:** Railway, Heroku, AWS ECS, DigitalOcean, or any Docker-compatible host

**Dockerfile:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

**Decision 16: Frontend Deployment — EAS (Expo) for mobile; Vercel/Netlify for web**

**Why EAS:**

- Native iOS/Android builds without local Mac or Android SDK
- Web export handled by Expo; deploy to CDN

**Process:**

```
eas build --platform ios --type production
eas build --platform android --type production
eas submit --platform ios --latest
eas submit --platform android --latest

# For web:
expo export --platform web
# Deploy dist/ to Vercel or Netlify
```

---

**Decision 17: Database Backup & Recovery — Managed provider PITR**

**Why managed backups:**

- Automatic daily backups with point-in-time recovery (PITR)
- Encrypted at rest by provider
- Restore in minutes without manual ops

**Providers:** Heroku Postgres, Railway, AWS RDS, DigitalOcean Managed Databases

---

**Decision 18: Monitoring & Logging — Structured JSON to stdout**

**Why 12-factor app pattern:**

- Logs to stdout; container orchestrator captures and stores them
- No external logging service needed for MVP
- JSON format allows log aggregation (DataDog, New Relic, CloudWatch) to parse structured data

**Implementation:**

```typescript
// src/main.ts
const logger = new Logger();
app.useLogger(logger);

logger.log("Memory created", {
  memoryId: "uuid",
  userId: "uuid",
  timestamp: new Date().toISOString()
});
```

---

## Decision Summary Table

| Category            | Decision                 | Rationale                             | Version                |
| ------------------- | ------------------------ | ------------------------------------- | ---------------------- |
| **ORM**             | TypeORM                  | Native PostGIS, NestJS integration    | ^10.0.0                |
| **Caching**         | node-cache (MVP)         | Scale with Redis later                | builtin                |
| **Spatial Index**   | GiST                     | Fast nearby & bounding-box queries    | PostgreSQL             |
| **Auth**            | JWT + Refresh            | Stateless, mobile-friendly, revocable | @nestjs/jwt ^11        |
| **RBAC**            | 3 roles (User/Mod/Admin) | Clean permission separation           | custom                 |
| **Encryption**      | TLS + provider at-rest   | Industry standard, no overhead        | builtin                |
| **API Style**       | REST + Swagger           | Simple, auto-docs, caching            | @nestjs/swagger ^7     |
| **Upload**          | Streaming to S3          | No server buffering                   | aws-sdk ^2             |
| **Images**          | Sharp.js                 | Pure JS, serverless-friendly          | ^0.33                  |
| **Audio**           | FFmpeg normalize         | Consistent Teleport playback          | fluent-ffmpeg ^2       |
| **Real-Time**       | WebSocket Gateway        | Immediate notifications               | @nestjs/websockets ^10 |
| **Rate Limit**      | Token bucket             | Per-user, per-endpoint                | @nestjs/throttler ^4   |
| **Deployment**      | Docker + managed         | Reproducible, scalable                | node:20-alpine         |
| **Frontend Deploy** | EAS + Vercel/Netlify     | Native + web from one codebase        | eas-cli latest         |
| **Logging**         | Structured JSON stdout   | 12-factor, log aggregation ready      | builtin                |

---

## Implementation Readiness

✅ **All critical architectural decisions locked in**

**Next phase:** Step 5 will define implementation patterns to ensure consistency across AI agents:

- TypeORM entity & repository patterns
- NestJS module organization
- API request/response DTO structures
- Frontend component composition patterns
- Testing patterns (unit, integration, e2e)

---

## Implementation Patterns & Consistency Rules

### Overview

These patterns prevent AI agents from making incompatible code decisions. They define **how** agents should implement, not **what** they should implement.

**Critical conflict points addressed:**

- Database naming (lowercase snake_case vs other conventions)
- API endpoint naming (plural vs singular resources)
- Code naming (camelCase vs snake_case vs PascalCase)
- Project structure (modular organization)
- Error handling (consistent error envelopes)
- Request/response formats (DTOs, timestamps)

---

### **1. NAMING PATTERNS**

#### **Database Naming — STRICTLY lowercase snake_case**

**Why:** PostgreSQL convention, easier in migrations, consistent with TypeORM defaults.

**Rules:**

- Table names: `users`, `memories`, `postcards`, `reports` (lowercase, plural)
- Column names: `user_id`, `created_at`, `updated_at` (snake_case)
- Foreign keys: `user_id` (NOT `fk_user_id` or `UserId`)
- Indexes: `idx_memories_location`, `idx_users_email` (NOT `MemoriesLocationIndex`)
- Constraints: `uc_memories_id_per_user` (unique constraints prefixed `uc_`)

**Examples:**

```sql
-- ✅ CORRECT
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_memories_location ON memories USING GIST(location);

-- ❌ WRONG
CREATE TABLE Memories (
  Id UUID,
  UserId UUID,
  Location GEOGRAPHY
);
```

---

#### **API Naming — Plural resource nouns, camelCase parameters**

**Rules:**

- Resources: `/memories`, `/postcards`, `/social/posts` (plural)
- Route parameters: `:id` (lowercase, not `:memoryId`)
- Query parameters: `?userId=uuid&limit=20` (camelCase)
- HTTP methods: POST (create), GET (read), PATCH (update), DELETE (delete)

**Examples:**

```
✅ CORRECT
GET    /memories
POST   /memories
GET    /memories/:id
PATCH  /memories/:id
DELETE /memories/:id
GET    /memories?userId=uuid&limit=20
POST   /social/posts/:id/like
DELETE /social/posts/:id/like

❌ WRONG
GET    /memory                          (singular)
GET    /Memories/:id                    (capitalized)
GET    /memories?user_id=uuid           (snake_case param)
```

---

#### **Code Naming — camelCase for TypeScript/JavaScript**

**Rules:**

- Variables: `userId`, `memoryId`, `createdAt` (camelCase)
- Functions: `getUserData`, `createMemory`, `isExpired` (camelCase, verb-first)
- Classes/Interfaces: `UserEntity`, `MemoryRepository`, `MemoriesService` (PascalCase)
- Files: `users.service.ts`, `memory.repository.ts`, `create-memory.dto.ts` (kebab-case)
- Constants: `MAX_UPLOAD_SIZE`, `DEFAULT_CACHE_TTL` (UPPER_SNAKE_CASE)

**Examples:**

```typescript
// ✅ CORRECT
export class MemoriesService {
  async getUserMemories(userId: string, limit: number = 20): Promise<Memory[]> {
    const cacheKey = `memories:${userId}`;
    return this.cacheService.get(cacheKey) || this.repository.find({ userId });
  }
}

// ❌ WRONG
export class MemoriesService {
  async get_user_memories(userId: string, Limit: number) {
    const CacheKey = `memories:${userId}`;
  }
}
```

---

### **2. PROJECT STRUCTURE PATTERNS**

#### **NestJS Backend Structure**

```
backend/src/
├── main.ts                              # Application entry
├── app.module.ts                        # Root module
├── auth/                                # Module per domain
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── dto/
│   │   ├── register.dto.ts
│   │   └── login.dto.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── roles.guard.ts
│   └── test/
│       └── auth.service.spec.ts        # Tests co-located
├── memories/
│   ├── memories.controller.ts
│   ├── memories.service.ts
│   ├── memories.module.ts
│   ├── entities/
│   │   └── memory.entity.ts
│   ├── repositories/
│   │   └── memory.repository.ts
│   ├── dto/
│   └── test/
├── social/
│   ├── posts/
│   ├── feed/
│   └── social.module.ts
├── moderation/
├── admin/
├── common/                              # Shared across modules
│   ├── exceptions/
│   ├── filters/
│   ├── interceptors/
│   ├── decorators/
│   ├── guards/
│   └── pipes/
└── config/
```

**Key Rules:**

- **One module per domain** (auth, memories, social, moderation, admin)
- **No circular dependencies** (auth cannot import from memories)
- **Shared code in `common/`** (never duplicate guards, exception handling, decorators)
- **Tests live alongside code** (`*.spec.ts` in same directory)

---

#### **Expo Frontend Structure**

```
frontend/cross-platform/
├── app/                                 # File-based routing
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (app)/
│   │   ├── _layout.tsx                  # Tab navigator
│   │   ├── memories/
│   │   │   ├── index.tsx                # Living Map
│   │   │   └── [id].tsx
│   │   ├── social/
│   │   └── admin/
│   └── _layout.tsx                      # Root layout
├── components/
│   ├── auth/
│   ├── memories/                        # By feature domain
│   ├── social/
│   └── common/
├── screens/                             # Screen containers (logic)
├── services/                            # API clients & business logic
│   ├── api/
│   │   ├── client.ts
│   │   ├── memories.api.ts
│   │   └── auth.api.ts
│   ├── storage/
│   └── types/
├── hooks/
├── utils/
├── constants/
├── context/                             # React Context (one per domain)
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
└── __tests__/                           # Parallel test structure
```

**Key Rules:**

- **Screens handle data; Components are presentational**
- **API calls only in services, never in components**
- **One context per domain** (not monolithic AppContext)
- **Tests mirror source structure**

---

### **3. API FORMAT PATTERNS**

#### **Request/Response Envelope (all responses)**

```typescript
// SUCCESS (200, 201)
{
  "success": true,
  "data": { /* actual response */ },
  "meta": { "timestamp": "2025-12-19T10:30:45Z" }
}

// PAGINATED
{
  "success": true,
  "data": [ /* array */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}

// ERROR (4xx, 5xx)
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email already exists"
  },
  "meta": { "timestamp": "2025-12-19T10:30:45Z" }
}
```

---

#### **DTO Naming & Structure**

**Rules:**

- Request: `Create{Entity}Dto`, `Update{Entity}Dto`, `Filter{Entity}Dto`
- Response: `{Entity}ResponseDto` (or use entity with `@Exclude()`)

**Examples:**

```typescript
// ✅ CORRECT
export class CreateMemoryDto {
  @IsUUID()
  userId: string;

  @Type(() => Number)
  @IsNumber()
  lat: number;
}

export class MemoryResponseDto {
  id: string;
  userId: string;
  createdAt: Date;

  @Exclude()
  deletedAt?: Date; // Never expose internal fields
}

// ❌ WRONG
export class MemoryDto {
  // Not specific (Create vs Update?)
  Id: string; // Not camelCase
  UserID: string; // Inconsistent casing
}
```

---

#### **Date/Time Format — ISO 8601 only**

**Rule:** All timestamps are ISO 8601 strings in APIs.

```typescript
// ✅ CORRECT
{ "createdAt": "2025-12-19T10:30:45Z" }

// ❌ WRONG
{ "createdAt": 1766222445000 }           // Unix timestamp
{ "createdAt": "12/19/2025" }            // Not ISO 8601
```

---

### **4. DATABASE ENTITY PATTERNS**

#### **TypeORM Entity Conventions**

```typescript
// ✅ CORRECT
@Entity("memories")
export class MemoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  user_id: string;

  @ManyToOne(() => UserEntity, (user) => user.memories)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column("geography", { spatialFeatureType: "Point", srid: 4326 })
  location: Point;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "timestamp", nullable: true })
  deleted_at?: Date; // Soft delete
}

// ❌ WRONG
@Entity("Memories") // Not lowercase
export class MemoriesEntity {
  @Column()
  UserId: string; // Not snake_case

  @Column()
  createdAt: Date; // Not snake_case
}
```

---

### **5. SERVICE & REPOSITORY PATTERNS**

#### **Three-Layer Architecture: Repository → Service → Controller**

```typescript
// REPOSITORY (data access only)
@Injectable()
export class MemoriesRepository {
  async findById(id: string): Promise<MemoryEntity | null> {
    return this.dataSource
      .getRepository(MemoryEntity)
      .findOne({ where: { id, deleted_at: IsNull() } });
  }
}

// SERVICE (business logic)
@Injectable()
export class MemoriesService {
  constructor(
    private readonly repository: MemoriesRepository,
    private readonly cacheService: CacheService
  ) {}

  async getMemory(id: string): Promise<MemoryResponseDto> {
    const cached = await this.cacheService.get(`memory:${id}`);
    if (cached) return cached;

    const memory = await this.repository.findById(id);
    if (!memory) throw new NotFoundException("Memory not found");

    await this.cacheService.set(`memory:${id}`, memory, 300);
    return memory;
  }
}

// CONTROLLER (HTTP handling only)
@Controller("memories")
export class MemoriesController {
  constructor(private readonly service: MemoriesService) {}

  @Get(":id")
  async getMemory(@Param("id") id: string) {
    return this.service.getMemory(id);
  }
}
```

**Key Rules:**

- **Repository:** Query layer ONLY, no business logic
- **Service:** Business logic, orchestration, caching, transactions
- **Controller:** HTTP request/response handling, DTO validation

---

### **6. ERROR HANDLING PATTERNS**

#### **Global Exception Filter (all errors use same envelope)**

```typescript
// All errors return consistent format
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: HttpArgumentsHost) {
    const response = host.getResponse<Response>();

    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let message = "Internal server error";

    if (exception instanceof BadRequestException) {
      statusCode = 400;
      errorCode = "INVALID_INPUT";
    } else if (exception instanceof NotFoundException) {
      statusCode = 404;
      errorCode = "NOT_FOUND";
    }

    response.status(statusCode).json({
      success: false,
      error: { code: errorCode, message },
      meta: { timestamp: new Date().toISOString() }
    });
  }
}

// Usage in services
throw new BadRequestException({
  code: "DUPLICATE_EMAIL",
  message: "Email already registered"
});
```

---

### **7. TESTING PATTERNS**

#### **Unit Tests (co-located with source)**

```typescript
// src/memories/test/memories.service.spec.ts
describe("MemoriesService", () => {
  let service: MemoriesService;
  let repository: MemoriesRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MemoriesService,
        { provide: MemoriesRepository, useValue: { findById: jest.fn() } }
      ]
    }).compile();

    service = module.get<MemoriesService>(MemoriesService);
    repository = module.get<MemoriesRepository>(MemoriesRepository);
  });

  it("should return memory by id", async () => {
    const mockMemory = { id: "uuid", userId: "uuid" };
    jest.spyOn(repository, "findById").mockResolvedValue(mockMemory);

    const result = await service.getMemory("uuid");
    expect(result).toEqual(mockMemory);
  });
});
```

#### **Integration Tests (controller + service + real DB)**

```typescript
describe("MemoriesController (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [MemoriesModule, DatabaseModule]
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it("POST /memories should create memory", async () => {
    const dto: CreateMemoryDto = { userId: "uuid", lat: 45.5, lng: -122.6 };

    const response = await request(app.getHttpServer())
      .post("/memories")
      .send(dto)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });
});
```

**Key Rules:**

- **Unit tests:** Mock dependencies, test business logic isolation
- **Integration tests:** Real DB (in-memory or test container), real HTTP layer
- **File location:** `test/` directory parallel to source

---

### **8. ENFORCED CONSISTENCY CHECKLIST**

**All AI agents implementing stories MUST follow:**

- ✅ **Database:** lowercase snake_case (tables, columns, indexes)
- ✅ **API:** Plural nouns, camelCase parameters, `success/data/meta` envelope
- ✅ **Code:** camelCase functions/vars, PascalCase classes, kebab-case files
- ✅ **DTOs:** Create/Update/Filter{Entity}Dto naming, `@Exclude()` for sensitive fields
- ✅ **Services:** No business logic in controllers; no DB queries outside repositories
- ✅ **Errors:** Use GlobalExceptionFilter, semantic error codes, consistent envelope
- ✅ **Tests:** Unit + integration, 1 test file per source file, parallel structure
- ✅ **Dates:** ISO 8601 strings in APIs (never Unix timestamps)
- ✅ **Responses:** Always `{ success, data, meta }`
- ✅ **Dependencies:** No circular imports (auth → memories OK; memories → auth NOT OK)

---

## Architecture Complete ✅

**All 5 Steps Finalized:**

1. ✅ **Project Context:** All 18 Vietnamese use cases (UC1-UC18) covered
2. ✅ **Product Principles:** Cloud of Unknowing, Audio-First Extraction
3. ✅ **Starter Templates:** Expo 54.x + NestJS 11.x + TypeORM
4. ✅ **Core Decisions:** 18 architectural decisions locked
5. ✅ **Implementation Patterns:** Naming, structure, error handling, testing locked

**Ready for development:**

- All use cases have API routes, RBAC, and database support
- Tech stack verified with current versions
- Consistency rules prevent AI agent conflicts
- Full project structure defined
- Implementation patterns documented

**Next phase:** Prepare user stories for implementation teams and AI agents

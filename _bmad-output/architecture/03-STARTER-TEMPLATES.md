---
title: "Starter Template Evaluation & Technology Stack"
project: "se122-image-sharing-social-media"
date: "2025-12-19"
status: "Selected"
---

# Starter Template Evaluation & Technology Stack

> **Navigation:** See [00-INDEX.md](00-INDEX.md) for the complete architecture guide.

## Primary Technology Domain

**Cross-platform mobile-first with web support (React Native/Expo) + TypeScript backend (NestJS)**

Given the requirement for a PWA-first experience that works on web, iOS, and Android, we're using:

- **Frontend:** Expo (React Native) with file-based routing and universal exports
- **Backend:** NestJS with Express or Fastify HTTP adapter

## Starter Options Considered & Selected

### Frontend: Expo with Expo Router

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

### Backend: NestJS

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
| **Frontend (Client)**     | Expo + React Native    | 54.x / 0.81.x  | Cross-platform for UC1-UC11; Voice & camera APIs; file-based routing          |
| **Frontend (Console)**    | Vite + React           | ^5.x / ^18.x   | Dedicated admin dashboard (UC12-UC18); lightweight, standard web stack        |
| **Backend (HTTP)**        | NestJS + Express       | 11.x           | TypeScript-first; modular; Guards for RBAC; DTO validation                    |
| **Backend (Optional)**    | Fastify adapter        | ~11.x          | Drop-in replacement for Express if performance optimization needed later      |
| **Database**              | PostgreSQL + PostGIS   | 15.x+          | Spatial queries for map; PostGIS extension for bounding-box & nearby searches |
| **ORM**                   | TypeORM                | ^10.x          | Native PostGIS support, NestJS integration                                    |
| **Authentication**        | JWT + Refresh Tokens   | Custom         | Stateless, mobile-friendly, revocable                                         |
| **Object Storage**        | S3-compatible + CDN    | AWS S3 / Minio | For photos and audio; signed URLs for secure delivery                         |
| **Deployment (Frontend)** | EAS (Expo)             | ~latest        | Managed build service for iOS, Android, and web; zero-config                  |
| **Deployment (Backend)**  | Docker + Railway / AWS | ~TBD           | Containerized NestJS app; scale horizontally                                  |

---

## Architecture Decisions Locked by Starters

✅ **Frontend:**

- Universal cross-platform codebase `frontend/cross-platform` for UC1-UC11
- File-based routing with native and web support
- Native OS APIs for camera, audio, geolocation (via Expo SDK)
- React Native StyleSheet for platform-specific styling
- **Web Console:** Separate `frontend/web-console` (Vite+React) for Admin/Mod tools

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

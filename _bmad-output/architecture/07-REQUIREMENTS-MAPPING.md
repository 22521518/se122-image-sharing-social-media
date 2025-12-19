---
title: "Use Case to Architecture Mapping"
project: "se122-image-sharing-social-media"
date: "2025-12-19"
status: "Complete"
---

# Use Case to Architecture Mapping

> **Navigation:** See [00-INDEX.md](00-INDEX.md) for the complete architecture guide.

All 18 Vietnamese use cases mapped to backend modules, API endpoints, frontend routes, and architectural support.

---

## Authentication & Profile (UC1-3)

### UC1: User Registration

- **Module:** `auth/`
- **Endpoint:** `POST /auth/register`
- **Frontend:** `(auth)/register.tsx`
- **DTO:** `CreateUserDto` (email, password, name)
- **Response:** User object + accessToken + refreshToken (HttpOnly cookie)
- **Validation:** Email uniqueness, password strength
- **Database:** Users table with hashed password + refresh_tokens table

### UC2: User Login

- **Module:** `auth/`
- **Endpoint:** `POST /auth/login`
- **Frontend:** `(auth)/login.tsx`
- **DTO:** `LoginDto` (email, password)
- **Response:** User object + accessToken + refreshToken (HttpOnly cookie)
- **Authentication:** JWT validation
- **Database Query:** Find user by email, verify password hash

### UC3: Profile Management

- **Module:** `auth/` + `social/profiles/`
- **Endpoints:**
  - `GET /auth/profile` (get current user)
  - `PATCH /auth/profile` (update profile: name, avatar, privacy)
  - `GET /social/profiles/:userId` (public profile view)
- **Frontend:** `(app)/profiles/me.tsx` + `(app)/profiles/[userId].tsx`
- **DTO:** `UpdateProfileDto` (name, avatar, bio, privacy)
- **RBAC:** User can only edit own profile
- **Database:** Users table (name, avatar, created_at, updated_at)

---

## Core Memory Capture (UC4-6)

### UC4: Voice Sticker Capture

- **Module:** `memories/`
- **Endpoint:** `POST /memories` + `POST /memories/:id/voice`
- **Frontend:** `(app)/memories/capture.tsx`
- **DTO:** `CreateMemoryDto` (photo, voiceBlob) → `AddVoiceDto` (audio)
- **Process:**
  1. Upload photo (optional) via `memories/upload`
  2. Record voice (1-5 seconds)
  3. Stream audio to S3 via `memories/:id/voice`
  4. FFmpeg normalizes audio (-20dB peak)
- **RBAC:** User can only create own memories
- **Caching:** Cache invalidated on new memory
- **Database:** memories table (user_id, photo_url, audio_url, created_at, status)

### UC5: Living Map View

- **Module:** `memories/`
- **Endpoint:** `GET /memories/map?bbox=...`
- **Frontend:** `(app)/memories/index.tsx` (Living Map component)
- **Query:** Bounding box search via PostGIS `ST_DWithin`
- **Caching:** Viewport cached for 5 min (node-cache)
- **Response:** Array of memory pins with location, thumbnail, voice preview
- **Performance:** <200ms query time via GiST spatial index
- **Cloud of Unknowing:** Unplaced memories (geo=null) aggregated as single O(1) element

### UC6: EXIF Processing & Bulk Import

- **Module:** `memories/`
- **Endpoint:** `POST /memories/bulk-import`
- **Frontend:** `(app)/memories/bulk-import.tsx`
- **Process:**
  1. User selects photos from device
  2. Extract EXIF geolocation via `expo-media-library`
  3. Batch create unplaced memories (geo=null if EXIF missing)
  4. Return count of imported + unplaced
- **RBAC:** User can only import to own account
- **Constraint:** No Review & Repair UI (Cloud of Unknowing only)
- **Database:** Bulk insert into memories table (batch operation)
- **Audio-First Rule:** User must add voice to extract from Cloud

---

## Rediscovery & Postcards (UC10-11)

### UC10: Teleport Rediscovery

- **Module:** `memories/`
- **Endpoint:** `GET /memories/teleport`
- **Frontend:** `(app)/memories/teleport.tsx`
- **Process:**
  1. Select random non-repeating memory
  2. Animate map to location (0.2s shutter effect)
  3. Play audio with volume-normalized clip
  4. Show memory context (time, location)
- **Caching:** Keep teleport history in state to avoid repeats
- **Performance:** Audio playback <100ms latency
- **Database Query:** Random select with replay-prevention token

### UC11: Time-Locked Postcards

- **Module:** `postcards/` (top-level)
- **Endpoints:**
  - `POST /postcards` (create)
  - `GET /postcards` (list sent/received)
  - `POST /postcards/:id/unlock` (unlock if condition met)
- **Frontend:** `(app)/postcards/index.tsx` + `(app)/postcards/[id].tsx`
- **DTO:** `CreatePostcardDto` (recipientId, unlockCondition, message, media)
- **Unlock Conditions:**
  - Time-based: `unlockAt` timestamp
  - Location-based: `unlockLocation` + `unlockRadius`
- **RBAC:** User can send postcards, recipient can unlock
- **Real-Time:** WebSocket notification when postcard unlocks
- **Database:** postcards table (sender_id, recipient_id, unlock_condition, unlocked_at)

---

## Social & Discovery (UC7-9)

### UC7: Feed Discovery

- **Module:** `social/feed/`
- **Endpoint:** `GET /social/feed?page=1&limit=20`
- **Frontend:** `(app)/social/feed.tsx`
- **Query:** Posts from followed users + recommended, paginated
- **Caching:** Feed cached for 1 min per user
- **Response:** Array of post objects with author, media, engagement counts
- **RBAC:** Respects post privacy (Private/Friends/Public)
- **Database:** posts table + follows table for graph traversal

### UC8: Search & Explore

- **Module:** `social/discovery/`
- **Endpoints:**
  - `GET /social/search?q=...` (posts, users, hashtags)
  - `GET /social/explore` (trending posts)
- **Frontend:** `(app)/social/explore.tsx`
- **Query:** Full-text search on post caption + hashtags, or trending algorithm
- **Response:** Mixed results (posts + users) with relevance ranking
- **RBAC:** Search respects post privacy
- **Caching:** Trending posts cached for 1 hour
- **Database:** posts table (caption, hashtags) + search index (future)

### UC9: Social Interactions

- **Module:** `social/posts/`
- **Endpoints:**
  - `POST /social/posts` (create post)
  - `PATCH /social/posts/:id` (edit)
  - `DELETE /social/posts/:id` (delete)
  - `POST /social/posts/:id/like` (like)
  - `POST /social/posts/:id/comment` (comment)
  - `POST /social/follow/:userId` (follow)
- **Frontend:** Multiple screens in `(app)/social/`
- **DTO:** `CreatePostDto` (caption, media[], privacy), `CommentDto`, `FollowDto`
- **RBAC:**
  - User can edit/delete own posts
  - Any user can like, comment, follow
  - Moderator can delete posts/comments
- **Real-Time:** WebSocket notifications on follow, like, comment
- **Database:** posts, comments, likes, follows tables

---

## Moderation (UC12-14)

### UC12: Content Reporting

- **Module:** `moderation/`
- **Endpoint:** `POST /reports` + `GET /reports` (user's own reports)
- **Frontend:** Report button on posts, comments, profiles
- **DTO:** `CreateReportDto` (targetType, targetId, reason, context)
- **RBAC:** Any user can report
- **Queue:** Reports go into queue for moderator review
- **Database:** reports table (reporter_id, target_id, reason, status, created_at)

### UC13: Moderator Review

- **Module:** `moderation/`
- **Endpoint:** `GET /admin/reports?status=pending`
- **Frontend:** `admin/moderation.tsx`
- **Query:** List reports by status (pending, reviewed, resolved)
- **RBAC:** Moderator only
- **Response:** Report with full context (post, author, reporter, history)
- **Database Query:** Joined query across reports + posts + users

### UC14: Content Moderation Actions

- **Module:** `moderation/`
- **Endpoint:** `PATCH /admin/reports/:id` (action: hide, delete, restore, dismiss)
- **Frontend:** Moderation queue interface
- **DTO:** `ModerateReportDto` (action, reason, notes)
- **RBAC:** Moderator only
- **Side Effects:**
  - Notification to reported user
  - Audit log of moderation action
  - Update post visibility (hide/delete)
- **Database Updates:** reports table (status, resolved_at) + audit_logs table

---

## Admin (UC15-18)

### UC15: User Management

- **Module:** `admin/`
- **Endpoints:**
  - `GET /admin/users?page=1&limit=50` (list all users)
  - `PATCH /admin/users/:id` (update role, status)
- **Frontend:** `admin/users.tsx`
- **RBAC:** Admin only
- **Actions:** Promote to moderator, demote, suspend, delete account
- **Database:** users table (role, status, updated_at)

### UC16: System Monitoring

- **Module:** `admin/`
- **Endpoint:** `GET /admin/monitoring`
- **Frontend:** `admin/monitoring.tsx` (dashboard)
- **Metrics:**
  - User count, active users
  - Memory count, storage used
  - Post count, social engagement
  - Report count, moderation queue size
  - API performance (p50, p99 latency)
- **Database:** Aggregated queries with caching
- **RBAC:** Admin only

### UC17: Data Export

- **Module:** `admin/`
- **Endpoint:** `POST /exports` (async job)
- **Frontend:** User settings → "Download my data"
- **Process:**
  1. User requests export
  2. Background job zips all memories, posts, metadata
  3. Store in S3 with time-limited signed URL
  4. Notify user when ready
- **RBAC:** User exports own data, admin exports any user's data
- **Database:** exports table (user_id, job_id, status, url, expires_at)

### UC18: Account Deletion

- **Module:** `admin/` (soft delete logic) + all modules (cleanup)
- **Endpoint:** `DELETE /auth/profile` (user) or `PATCH /admin/users/:id` (admin)
- **Frontend:** Settings → "Delete Account"
- **Process:**
  1. Set user.deleted_at = NOW()
  2. Soft-delete all user's memories, posts, comments
  3. Delete associated media from S3
  4. Anonymize reports (replace username with "Deleted User")
  5. Keep audit logs for compliance
- **RBAC:** User can delete own account, admin can delete any account
- **Cascade:** All user's data marked with deleted_at
- **Database:** Query with `deleted_at IS NULL` filter applied globally

---

## Coverage Summary

| Category              | Count | Details                                                                                             |
| --------------------- | ----- | --------------------------------------------------------------------------------------------------- |
| **Use Cases**         | 18    | UC1-UC18 all mapped                                                                                 |
| **Modules**           | 11    | auth, memories, postcards, social/, moderation, admin, media, websocket, common, config, migrations |
| **API Endpoints**     | 50+   | RESTful + WebSocket                                                                                 |
| **RBAC Roles**        | 3     | User, Moderator, Admin                                                                              |
| **Database Tables**   | 15+   | users, memories, posts, comments, postcards, reports, follows, likes, etc.                          |
| **Caching Layers**    | 2     | Viewport caching (node-cache) + HTTP cache headers                                                  |
| **Real-Time**         | 2     | WebSocket (postcard unlock, social notifications)                                                   |
| **External Services** | 1     | S3 for media storage + CDN                                                                          |

---
title: "Project Structure & Boundaries"
project: "se122-image-sharing-social-media"
date: "2025-12-19"
status: "Final"
---

# Project Structure & Boundaries

> **Navigation:** See [00-INDEX.md](00-INDEX.md) for the complete architecture guide.

## Overview

This section defines the complete physical project structure, module organization, and architectural boundaries. Decisions incorporate feedback from cross-functional review (Mary on domain modeling, Sally on developer experience, Murat on testing strategy, Victor on scalability).

## Key Structural Decisions

1. **Postcards as top-level module** (not nested under social)

   - Rationale: Independent lifecycle, time-based unlock conditions, location triggers
   - Domain-driven design treats postcards as a first-class bounded context
   - Improves data integrity, test isolation, and long-term extensibility

2. **Social module subdivided into clear subdomains** (feed, discovery, profiles)

   - Avoids monolithic folder while respecting bounded context
   - Reflects user mental models ("Where do I explore?" vs "What's in my feed?")

3. **Event-driven architecture (selective, not global)**

   - Core read/write paths remain synchronous and explicit
   - Events used ONLY for side effects: notifications, analytics, audit logs
   - Improves testability without adding async complexity

4. **Scalability comments (not premature infrastructure)**
   - Code comments mark future upgrade points (geo-sharding, Redis pub/sub, job queues)
   - Signals intent without committing infrastructure complexity

---

## Module Dependencies (Acyclic)

**Enforced dependency direction:**

```
auth/
  ↓
memories/, postcards/, social/, moderation/
  ↓
media/ (used by memories, social, postcards)
  ↓
admin/ (depends on memories, social, moderation, auth)

common/ (imported by all modules, never imports others)
websocket/ (imported by all for real-time events)
```

**Key rule:** No circular imports. If Module A imports Module B, Module B cannot import Module A.

---

## Requirements to Structure Mapping

All 18 Vietnamese use cases (UC1-UC18) mapped to modules and API routes:

| UC # | Use Case            | Backend Module    | Frontend Route    | RBAC       |
| ---- | ------------------- | ----------------- | ----------------- | ---------- |
| UC1  | Register            | auth/             | (auth)/register   | Public     |
| UC2  | Login               | auth/             | (auth)/login      | Public     |
| UC3  | Profile Management  | auth/ + social/   | (app)/profiles/me | User+      |
| UC4  | Voice Capture       | memories/         | (app)/memories    | User+      |
| UC5  | Map View            | memories/         | (app)/memories    | User+      |
| UC6  | EXIF Processing     | memories/         | (app)/memories    | User+      |
| UC7  | Feed Discovery      | social/feed/      | (app)/social/feed | User+      |
| UC8  | Search              | social/discovery/ | (app)/social/exp  | User+      |
| UC9  | Social Interactions | social/posts/     | (app)/social/     | User+      |
| UC10 | Teleport            | memories/         | (app)/memories    | User+      |
| UC11 | Time-Locked Posts   | postcards/        | (app)/postcards   | User+      |
| UC12 | Content Reporting   | moderation/       | (app)/\*/report   | User+      |
| UC13 | Moderator Review    | moderation/       | admin/moderation  | Moderator+ |
| UC14 | Content Moderation  | moderation/       | admin/moderation  | Moderator+ |
| UC15 | User Management     | admin/            | admin/users       | Admin      |
| UC16 | System Monitoring   | admin/            | admin/monitoring  | Admin      |
| UC17 | Export Data         | admin/            | (app)/\*/export   | User+      |
| UC18 | Delete Account      | admin/            | (app)/settings    | User       |

---

## Architectural Boundaries

**API Layer:** REST endpoints with JWT authentication

**Auth Layer:** JWT access tokens (15-min) + refresh tokens (7-day HttpOnly cookies)

**RBAC Model:**

- **User:** Create/edit own memories, posts, comments, report content
- **Moderator:** Review reports, hide/delete posts, lock comments
- **Admin:** Manage users/roles, system monitoring, triage reports, view logs

**Caching:**

- **MVP:** node-cache for viewport queries
- **Future:** Redis for multi-server deployments

**Event-Driven (side effects only):**

- Notifications on postcard unlock
- Analytics on memory creation, teleport, social interactions
- Audit logs on moderation actions
- Real-time updates via WebSocket

**Dependencies:**

- ✅ auth → memories (users can create memories)
- ✅ memories → media (media processing for photos/audio)
- ✅ social → media (posts can include media)
- ✅ postcards → media (postcards include photos)
- ✅ moderation → auth, memories, social (review content)
- ✅ admin → all modules (system-wide management)
- ❌ NO circular imports

**Testing:**

- Unit tests mock all dependencies
- Integration tests use real database (in-memory or test container)
- Tests co-located with source code (same directory)

---

## Step 6 Complete ✅

**Architecture finalized with:**

✅ Postcards elevated to top-level module (domain-driven design)  
✅ Social subdivided into feed/discovery/profiles (developer ergonomics)  
✅ Event-driven patterns for side effects only (MVP velocity)  
✅ Scalability comments documented (no premature infrastructure)  
✅ All 18 use cases mapped to modules and routes  
✅ RBAC rules clearly defined  
✅ No circular dependencies

**Next: Validation & Implementation Handoff**

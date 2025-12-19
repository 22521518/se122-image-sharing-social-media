---
title: "Core Architectural Decisions"
project: "se122-image-sharing-social-media"
date: "2025-12-19"
status: "Locked"
---

# Core Architectural Decisions

> **Navigation:** See [00-INDEX.md](00-INDEX.md) for the complete architecture guide.

All 18 core architectural decisions with versions, rationale, and implementation details.

## Data Architecture

### Decision 1: ORM — TypeORM

**Why TypeORM:**

- Native PostGIS support (`geography` column type without custom scalars)
- Direct integration with NestJS decorators (@Entity, @Column, @PrimaryGeneratedColumn)
- Repository pattern aligns with clean architecture
- Strong type safety from decorator-driven design

**Version:** `@nestjs/typeorm` ^10.0.0, `typeorm` ^0.3.19

**Impact:** All database queries use TypeORM repositories; entities are source of truth for schema.

---

### Decision 2: Caching Strategy — In-Memory (node-cache) for MVP, Redis upgrade path

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

### Decision 3: Spatial Indexing — GiST on location column

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

## Authentication & Security

### Decision 4: Authentication — JWT Access Token + Refresh Token (HttpOnly Cookie)

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

### Decision 5: RBAC — Three-Role Model (User / Moderator / Admin)

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

### Decision 6: Encryption — TLS 1.3 (in-transit) + Provider-managed at-rest

**Why delegated encryption:**

- All API traffic over HTTPS (TLS 1.3)
- Database encryption at rest handled by managed provider (Heroku Postgres, Railway, AWS RDS all include this)
- EXIF data and geolocation encrypted by default at provider level
- No performance overhead; encryption is transparent

---

## API & Communication

### Decision 7: API Design — REST + OpenAPI/Swagger

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

### Decision 8: API Documentation — NestJS Swagger (auto-generated)

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

### Decision 9: Error Handling — Global Exception Filters + HTTP Status Codes

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

## Media Pipeline

### Decision 10: Media Upload — Streaming directly to S3 (no server buffering)

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

### Decision 11: Image Processing — Sharp.js for thumbnails and display variants

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

### Decision 12: Audio Processing — Volume normalization + duration validation

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

### Decision 13: Real-Time Notifications — WebSocket Gateway

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

### Decision 14: Rate Limiting — Token bucket per user, per endpoint

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

## Infrastructure & Deployment

### Decision 15: Backend Deployment — Docker container on managed platform

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

### Decision 16: Frontend Deployment — EAS (Expo) for mobile; Vercel/Netlify for web

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

### Decision 17: Database Backup & Recovery — Managed provider PITR

**Why managed backups:**

- Automatic daily backups with point-in-time recovery (PITR)
- Encrypted at rest by provider
- Restore in minutes without manual ops

**Providers:** Heroku Postgres, Railway, AWS RDS, DigitalOcean Managed Databases

---

### Decision 18: Monitoring & Logging — Structured JSON to stdout

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

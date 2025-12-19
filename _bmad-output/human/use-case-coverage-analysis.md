# Use Case Coverage Analysis

**Date:** 2025-12-19  
**Project:** Life Mapped (se122-image-sharing-social-media)  
**Purpose:** Verify that all 18 Vietnamese use cases (UC1-UC18) are architecturally supported

---

## Executive Summary

✅ **All 18 use cases are fully covered** by the architectural decisions in `architecture.md`

- API routes defined for each use case
- RBAC (Role-Based Access Control) enforces permissions
- Database schema and media pipeline support all operations
- Real-time features (WebSocket) enable interactive use cases

---

## Use Case Mapping & Architectural Support

### Table 1: Complete UC Mapping

| UC #     | Use Case (Tiếng Việt)          | English Translation     | API Endpoint(s)                                                                               | RBAC Role | Architectural Support                                             |
| -------- | ------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| **UC1**  | Đăng ký tài khoản              | Register Account        | `POST /auth/register`                                                                         | Public    | ✅ JWT auth, email/OAuth, user creation                           |
| **UC2**  | Đăng nhập                      | Login                   | `POST /auth/login` `POST /auth/login/google`                                                  | Public    | ✅ JWT + Refresh, OAuth flow, session mgmt                        |
| **UC3**  | Chỉnh sửa hồ sơ cá nhân        | Edit User Profile       | `GET /auth/profile` `PATCH /auth/profile`                                                     | User      | ✅ AuthGuard, profile endpoints, avatar upload to S3              |
| **UC4**  | Đăng bài viết                  | Create Post             | `POST /social/posts`                                                                          | User      | ✅ REST endpoint, DB persistence, validation                      |
| **UC5**  | Đăng tải ảnh                   | Upload Images           | `POST /social/posts` (with images) `POST /memories`                                           | User      | ✅ Streaming S3, Sharp image processing, multi-file support       |
| **UC6**  | Xóa/Chỉnh sửa bài đăng         | Edit/Delete Posts       | `PATCH /social/posts/:id` `DELETE /social/posts/:id`                                          | User      | ✅ Ownership validation, soft delete, audit trail                 |
| **UC7**  | Xem nguồn cấp dữ liệu          | View Feed               | `GET /social/feed`                                                                            | User      | ✅ Social graph, personalization algorithm, pagination            |
| **UC8**  | Khám phá nội dung              | Explore Content         | `GET /social/explore`                                                                         | User      | ✅ Recommendation engine, trending/curated content                |
| **UC9**  | Tìm kiếm nội dung              | Search Content          | `GET /social/search?q=...`                                                                    | User      | ✅ Full-text search (PostgreSQL), filters                         |
| **UC10** | Like/Bình luận/Chia sẻ         | Like/Comment/Share      | `POST /social/posts/:id/like` `POST /social/posts/:id/comment` `POST /social/posts/:id/share` | User      | ✅ REST endpoints, WebSocket for real-time updates                |
| **UC11** | Theo dõi/Hủy theo dõi          | Follow/Unfollow         | `POST /social/follow/:userId` `DELETE /social/follow/:userId`                                 | User      | ✅ Social graph module, relationship mgmt                         |
| **UC12** | Gửi báo cáo vi phạm            | Report Violations       | `POST /reports`                                                                               | User      | ✅ Report creation, audit logging, metadata capture               |
| **UC13** | Kiểm duyệt bài đăng            | Moderate Posts          | `GET /admin/reports` `PATCH /admin/reports/:id` (action: hide/delete)                         | Moderator | ✅ RolesGuard('Moderator', 'Admin'), moderation workflow          |
| **UC14** | Kiểm duyệt bình luận           | Moderate Comments       | `GET /admin/reports` `PATCH /admin/reports/:id` (action: lock/delete comment)                 | Moderator | ✅ RolesGuard, soft delete, comment locking                       |
| **UC15** | Quản lý người dùng             | Manage Users            | `GET /admin/users` `PATCH /admin/users/:id` (lock/unlock/role)                                | Admin     | ✅ RolesGuard('Admin'), user state mgmt, role assignment          |
| **UC16** | Giám sát hoạt động hệ thống    | Monitor System Activity | `GET /admin/monitoring`                                                                       | Admin     | ✅ Structured JSON logging, metrics endpoint, observability       |
| **UC17** | Quản lý báo cáo và khiếu nại   | Manage Reports          | `GET /admin/reports` `PATCH /admin/reports/:id`                                               | Admin     | ✅ Report triage dashboard, filtering, action tracking            |
| **UC18** | Cấp quyền tài khoản kiểm duyệt | Assign Moderator Role   | `PATCH /admin/users/:id` (role: Moderator)                                                    | Admin     | ✅ RolesGuard('Admin'), role update logic, permission propagation |

---

## Coverage by Category

### 1. **Authentication & Account Management (UC1, UC2, UC3)**

**Architectural Support:**

- JWT + Refresh Token pattern ensures stateless, scalable authentication
- OAuth (Google) integration for easy signup
- AuthGuard middleware protects all user-facing endpoints
- Profile endpoint secured with `@Roles('User')`

**API Contracts:**

```typescript
// UC1: Register
POST /auth/register
{
  "email": "user@example.com",
  "password": "secure123",
  "name": "User Name"
}
→ { "user": { "id", "email", "role": "user" }, "accessToken", "refreshToken" }

// UC2: Login
POST /auth/login
{ "email": "user@example.com", "password": "secure123" }
→ { "user": { "id", "email", "role": "user" }, "accessToken", "refreshToken" }

// UC3: Edit Profile
PATCH /auth/profile
{ "name": "New Name", "bio": "...", "avatar": "file.jpg", "privacy": "private" }
→ { "user": { "id", "email", "name", "bio", "avatar", "privacy" } }
```

---

### 2. **Content Creation & Management (UC4, UC5, UC6)**

**Architectural Support:**

- REST endpoints for CRUD operations on posts
- Streaming S3 upload for images (no server buffering)
- Sharp.js for image processing (thumbnails, display variants)
- Soft delete pattern for audit trail
- Ownership validation to prevent unauthorized edits

**API Contracts:**

```typescript
// UC4: Create Post
POST /social/posts
{
  "caption": "Check this out!",
  "tags": ["travel", "photography"],
  "privacy": "public"
}
→ { "id", "userId", "caption", "tags", "privacy", "createdAt", "likeCount", "commentCount" }

// UC5: Upload Images
POST /social/posts (with FormData including images)
FormData: { "caption": "...", "images": [file1, file2, ...] }
→ { "id", "imageUrls": ["https://...", "https://..."], ... }

// UC6: Edit/Delete Post
PATCH /social/posts/:id
{ "caption": "Updated caption", "tags": [...], "privacy": "private" }
→ { "id", "caption", "tags", "privacy", "updatedAt" }

DELETE /social/posts/:id
→ { "status": "deleted" }
```

---

### 3. **Discovery & Social Interactions (UC7, UC8, UC9, UC10, UC11)**

**Architectural Support:**

- PostgreSQL with full-text search for UC9
- Social graph module tracks follow relationships
- Feed algorithm personalizes content for UC7
- Recommendation engine provides curated content for UC8
- WebSocket Gateway enables real-time notifications for UC10

**API Contracts:**

```typescript
// UC7: View Feed
GET /social/feed?page=1&limit=20
→ { "posts": [...], "total", "page", "pageSize" }

// UC8: Explore
GET /social/explore?category=trending&limit=20
→ { "posts": [...], "total" }

// UC9: Search
GET /social/search?q=travel&type=posts|users|tags&limit=20
→ { "results": [...], "total" }

// UC10: Like/Comment/Share
POST /social/posts/:id/like
→ { "status": "liked", "likeCount" }

POST /social/posts/:id/comment
{ "text": "Great photo!" }
→ { "id", "userId", "text", "createdAt" }

POST /social/posts/:id/share
{ "recipientIds": ["uuid1", "uuid2"] }
→ { "status": "shared", "shareCount" }

// UC11: Follow/Unfollow
POST /social/follow/:userId
→ { "status": "following", "followerCount" }

DELETE /social/follow/:userId
→ { "status": "unfollowed", "followerCount" }
```

---

### 4. **Reporting & Content Safety (UC12)**

**Architectural Support:**

- Report creation endpoint with reason and context
- Audit logging captures all report metadata
- Links to reported content, user, and reporter
- Status tracking (open, in-review, resolved, dismissed)

**API Contract:**

```typescript
// UC12: Report Violation
POST /reports
{
  "reportedObjectType": "post" | "comment" | "user",
  "reportedObjectId": "uuid",
  "reason": "harassment" | "nsfw" | "spam" | "copyright",
  "context": "This violates..."
}
→ { "id", "reportedBy", "reportedObject", "reason", "status": "open", "createdAt" }
```

---

### 5. **Moderation & Admin (UC13, UC14, UC15, UC16, UC17, UC18)**

**Architectural Support:**

- RBAC with three roles: User, Moderator, Admin
- RolesGuard decorator enforces permissions on endpoints
- Moderation workflow with report queues
- Admin dashboard for system monitoring
- Structured JSON logging for observability

**Role Permissions:**

| Role          | Capabilities                                                                             |
| ------------- | ---------------------------------------------------------------------------------------- |
| **User**      | Create/edit own posts, like, comment, follow, report violations                          |
| **Moderator** | Review reports, hide/delete posts, lock/delete comments, view all reports                |
| **Admin**     | All moderator permissions + manage users, assign roles, system monitoring, report triage |

**API Contracts:**

```typescript
// UC13: Moderate Posts
GET /admin/reports?type=post&status=open
→ { "reports": [...], "total" }

PATCH /admin/reports/:id
{ "action": "hide" | "delete" | "restore", "reason": "spam" }
→ { "id", "action", "actionBy", "actionAt" }

// UC14: Moderate Comments
PATCH /admin/reports/:id
{ "action": "lock_comment" | "delete_comment", "reason": "harassment" }
→ { "id", "action", "actionAt" }

// UC15: Manage Users
GET /admin/users?page=1&limit=50
→ { "users": [...], "total" }

PATCH /admin/users/:id
{ "status": "active" | "locked", "role": "user" | "moderator" | "admin" }
→ { "id", "status", "role", "updatedAt" }

// UC16: Monitor System
GET /admin/monitoring
→ {
  "totalUsers": 1234,
  "totalPosts": 5678,
  "totalReports": 89,
  "avgResponseTime": 145,
  "uptime": "99.9%",
  "recentErrors": [...]
}

// UC17: Manage Reports
GET /admin/reports?status=pending
→ { "reports": [...], "total" }

PATCH /admin/reports/:id
{ "action": "assign_to_moderator", "moderatorId": "uuid" }
→ { "id", "assignedTo", "assignedAt" }

// UC18: Assign Moderator
PATCH /admin/users/:id
{ "role": "moderator", "permissions": ["moderate_posts", "moderate_comments"] }
→ { "id", "role": "moderator", "permissions": [...] }
```

---

## Architectural Components by Use Case Cluster

### **Cluster 1: Authentication (UC1-UC3)**

- Component: `AuthModule` (controller, service, guards)
- Database: User table with email/password, OAuth provider links
- Security: JWT tokens, refresh token rotation, password hashing (bcrypt)

### **Cluster 2: Content Management (UC4-UC6)**

- Component: `SocialModule` (posts controller, service)
- Database: Post table with user_id, content, privacy, timestamps
- Storage: S3 for images + Sharp processing pipeline
- Audit: Soft delete with timestamps

### **Cluster 3: Discovery & Social Graph (UC7-UC11)**

- Component: `SocialModule` (feed, explore, search, follow services)
- Database: Post table (full-text indexed), Follow table (social graph)
- Algorithm: Feed personalization, recommendation engine
- Real-time: WebSocket Gateway for notifications

### **Cluster 4: Reporting (UC12)**

- Component: `ReportsModule` (report controller, service)
- Database: Report table linking to posts/comments/users
- Audit: Structured logging of all reports

### **Cluster 5: Moderation & Admin (UC13-UC18)**

- Component: `AdminModule`, `ModerationModule`
- Database: Report table (status, action history), User table (role, status)
- Guards: RolesGuard with role-based access
- Monitoring: Structured JSON logging to stdout

---

## Implementation Priority

**Phase 1 (MVP - All Critical):**

- UC1, UC2, UC3: Authentication
- UC4, UC5, UC6: Post creation & management
- UC12: Reporting (enables moderation)

**Phase 2 (Core Social):**

- UC7, UC8: Feed & Explore
- UC10, UC11: Interactions & Following
- UC9: Search

**Phase 3 (Moderation & Admin):**

- UC13, UC14: Moderation
- UC15, UC16, UC17, UC18: Admin & Monitoring

---

## Risk Assessment

### ✅ **Low Risk Use Cases**

- UC1, UC2, UC3: Standard auth patterns (NestJS best practices)
- UC4, UC5, UC6: CRUD operations (well-understood)

### ⚠️ **Medium Risk Use Cases**

- UC7, UC8: Feed algorithm complexity (requires tuning)
- UC9: Full-text search performance (PostgreSQL indexing critical)
- UC10: Real-time interactions (WebSocket reliability)

### 🔴 **High Risk Use Cases**

- UC13, UC14, UC16, UC17, UC18: Admin/Moderation UX (must be intuitive for moderators)
  - Mitigation: Design moderation dashboard early, conduct user testing with potential moderators

---

## Testing Strategy by Use Case

| Use Cases | Test Type               | Examples                                                      |
| --------- | ----------------------- | ------------------------------------------------------------- |
| UC1-UC3   | Unit + Integration      | Auth flows, profile updates, token validation                 |
| UC4-UC6   | Integration + E2E       | Post creation, image upload, edit/delete workflows            |
| UC7-UC9   | Performance             | Feed latency <200ms, search response <500ms                   |
| UC10-UC11 | Integration + Real-time | Like/comment notifications, follow graph consistency          |
| UC12      | Integration             | Report creation, metadata capture, audit trail                |
| UC13-UC18 | Integration + E2E + UAT | Moderation workflows, admin dashboard, permission enforcement |

---

## Conclusion

✅ **All 18 Vietnamese use cases are fully supported** by the architecture defined in `architecture.md`.

**Next Steps:**

1. **Implementation Patterns (Step 5):** Define code conventions for consistent implementation
2. **Story Preparation:** Break each use case into implementation stories with acceptance criteria
3. **Development:** Implement stories in priority order (Auth → Content → Social → Moderation)
4. **Testing:** Automated tests + UAT with real moderators before launch

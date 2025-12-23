# Story 8.2: System Monitoring and Statistics

Status: ready-for-dev

## Story

As a **administrator**,
I want **to see system-wide statistics and logs**,
so that **I can monitor the health and growth of the platform**.

## Acceptance Criteria

1. **Given** I am in the admin dashboard
2. **When** I view the "Stats" page
3. **Then** I see KPIs refreshed every 5 minutes:
   - Total Users / Active Users (DAU: last 24h, MAU: last 30 days)
   - Total Posts/Memories/Storage Used (GB)
   - Error Rate (last hour, from application logs)
4. **And** I can view paginated audit logs with filters (date range, action type, user)

## Tasks / Subtasks

- [ ] Task 1: Stats API (Backend) (AC: 3)
  - [ ] Subtask 1.1: Create `GET /admin/stats` endpoint.
  - [ ] Subtask 1.2: Implement caching (Redis, 5min TTL) for expensive aggregations.
  - [ ] Subtask 1.3: Use `COUNT(DISTINCT userId)` with date filters for DAU/MAU.
  - [ ] Subtask 1.4: Query storage: `SUM(fileSize)` from media table.
- [ ] Task 2: Audit Logs API (AC: 4)
  - [ ] Subtask 2.1: Create `GET /admin/audit-logs?page=1&limit=50&startDate=...&actionType=...`.
  - [ ] Subtask 2.2: Return paginated results from `AuditLog` table.
- [ ] Task 3: Admin UI (AC: 1, 2)
  - [ ] Subtask 3.1: Create `DashboardHome.tsx` with KPI cards.
  - [ ] Subtask 3.2: Use charts library (e.g., `recharts`) for visualizations.
  - [ ] Subtask 3.3: Create `AuditLogViewer.tsx` with filters and pagination.

## Dev Notes

- **Architecture Patterns**:
  - **Performance**: NEVER run `COUNT(*)` without caching. Use Redis with 5min TTL.
  - **DAU/MAU**: Use indexed queries on `lastActiveAt` field (update on each user action).
  - **Storage**: Aggregate from media table, not filesystem scans.

- **Source Tree Components**:
  - `backend/v1_nestjs/src/admin/stats/admin-stats.service.ts`
  - `frontend/web-console/src/pages/admin/DashboardHome.tsx`

- **Testing Standards**:
  - Test cache invalidation.
  - Test stats accuracy with known data.

### References

- [Source: epics.md#Story 8.2]

## Dev Agent Record

### Completion Notes List

- Specified 5-minute cache TTL.
- Defined DAU/MAU calculation logic.
- Added audit log filtering.

### File List

- `backend/v1_nestjs/src/admin/stats/admin-stats.service.ts`
- `frontend/web-console/src/pages/admin/DashboardHome.tsx`

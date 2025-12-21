# AGENTS.md - Frontend (Web Console)

## Module Purpose
Web-based admin/moderator console built with React and Vite.

---

## Coding Conventions

### DTO Pattern (MANDATORY)
All API calls MUST use the DTO pattern to decouple component data from API response format.

**API Response Envelope:**
```json
{
  "success": true,
  "data": { /* actual payload */ },
  "meta": { "timestamp": "..." }
}
```

**Required Pattern:**
```typescript
// 1. Define DTO types in src/types/api.types.ts
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: { timestamp: string };
}

// 2. Create ApiService in src/services/api.service.ts
// 3. Access data via response.data, NOT response directly
const response = await fetch('/auth/login');
const json = await response.json();
const token = json.data?.accessToken || json.accessToken;
```

### File Structure
```
src/
├── services/    # API services
├── types/       # TypeScript types and DTOs
├── components/  # UI components
├── pages/       # Route pages
```

---

## Admin Console Responsibilities
- User and role management (Admin only)
- Moderation dashboard
- System monitoring
- Report queue management

---

## Rules for Dev Agents
1. ✅ Always use typed DTOs for API responses
2. ✅ Handle wrapped response format (`{ success, data, meta }`)
3. ❌ NEVER assume API returns data directly at root level
4. ❌ NEVER expose admin actions without proper role guard
5. ✅ All admin actions MUST be logged for audit

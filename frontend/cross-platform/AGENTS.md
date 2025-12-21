# AGENTS.md - Frontend (Cross-Platform)

## Module Purpose
Cross-platform mobile/web application built with Expo and React Native.

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

interface UserDto {
  id: string;
  email: string;
  name?: string;
}

// 2. Use ApiService for all API calls
// 3. Access data via response.data, NOT response directly
const response = await fetch('/auth/login');
const json = await response.json();
const token = json.data?.accessToken || json.accessToken; // Handle both formats
```

### File Structure
```
src/
├── context/     # React Context providers
├── services/    # API services (future: ApiService)
├── types/       # TypeScript types and DTOs
├── hooks/       # Custom React hooks
├── components/  # Reusable UI components
```

---

## Dependencies
- **Auth Context**: Handles authentication state
- **AsyncStorage**: Token persistence
- **Expo Router**: File-based routing

---

## Rules for Dev Agents
1. ✅ Always use typed DTOs for API responses
2. ✅ Handle wrapped response format (`{ success, data, meta }`)
3. ❌ NEVER assume API returns data directly at root level
4. ❌ NEVER hardcode API URLs - use `EXPO_PUBLIC_API_URL` env var

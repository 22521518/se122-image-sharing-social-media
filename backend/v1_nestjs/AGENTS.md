# AGENTS.md - Backend (NestJS)

## Module Purpose
Backend API service built with NestJS and Prisma (PostgreSQL). Handles authentication, social graph, memories, and media storage.

---

## Coding Conventions

### DTO Pattern (MANDATORY)
All API Endpoints MUST use DTOs for validation (class-validator) and API documentation (nestjs/swagger).

**Required Pattern:**
```typescript
// 1. Define DTO with validation decorators
export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}

// 2. Use in Controller
@Post()
create(@Body() dto: CreatePostDto) { ... }
```

### Response Envelope
Responses should generally be wrapped or standard NestJS return types. Global interceptors may handle wrapping `{ success, data, meta }` if configured, otherwise standard JSON.

### File Structure
```
src/
├── app.module.ts
├── main.ts
├── prisma/          # Prisma service & module
├── auth-core/       # Authentication logic
├── social/          # Social features (posts, likes, comments)
│   ├── posts/
│   ├── likes/
│   └── ...
├── memories/        # Memories features
├── media/           # Cloudinary/Media handling
└── ...
```

---

## Technology Stack

| Category | Package | Notes |
|----------|---------|-------|
| Framework | `NestJS` | Modular architecture |
| ORM | `Prisma` | Database access |
| Database | `PostgreSQL` | via Prisma |
| Validation | `class-validator` | DTO validation |
| Docs | `@nestjs/swagger` | API Documentation |
| Storage | `Cloudinary` | Media storage |

---

## Rules for Dev Agents
1. ✅ Always use `ParseUUIDPipe` for ID parameters.
2. ✅ Use `User` decorator to get authenticated user.
3. ❌ NEVER put business logic in Controllers (use Services).
4. ❌ NEVER hardcode secrets (use `ConfigService`).

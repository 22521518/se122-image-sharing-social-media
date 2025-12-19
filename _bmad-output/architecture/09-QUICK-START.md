---
title: "Quick Start Guide"
project: "se122-image-sharing-social-media"
date: "2025-12-19"
status: "Ready for Use"
---

# Quick Start Guide for Developers

> **Navigation:** See [00-INDEX.md](00-INDEX.md) for the complete architecture guide.

Fast reference for implementing features using the architecture specification.

---

## Getting Started

### Step 1: Clone & Review Architecture

```bash
# Start here
cat _bmad-output/architecture/00-INDEX.md

# Read in this order:
# 1. 01-PROJECT-CONTEXT.md (understand requirements)
# 2. 02-PRODUCT-PRINCIPLES.md (locked constraints)
# 3. 03-STARTER-TEMPLATES.md (tech stack)
# 4. 04-CORE-DECISIONS.md (18 architectural decisions)
# 5. 05-IMPLEMENTATION-PATTERNS.md (how to code)
# 6. 06-PROJECT-STRUCTURE.md (where to put code)
# 7. 07-REQUIREMENTS-MAPPING.md (UC→code mapping)
```

### Step 2: Initialize Projects

```bash
# Backend
nest new life-mapped-backend --strict
cd life-mapped-backend
npm install @nestjs/typeorm typeorm pg typeorm-geographic
npm install @nestjs/swagger swagger-ui-express
npm install @nestjs/jwt @nestjs/passport passport-jwt
npm install node-cache

# Frontend
cd ../frontend
npx create-expo-app@latest --template
npx expo install expo-router
npx expo install expo-av expo-media-library expo-location
npx expo install react-native-maps react-native-reanimated
```

### Step 3: Create Directory Structure

```bash
# Backend
backend/src/
├── common/        # Shared (guards, filters, pipes, decorators)
├── auth/          # Auth module (must be first)
├── memories/      # Memories module
├── postcards/     # Postcards module (top-level!)
├── social/        # Social module with subfolders
├── moderation/    # Moderation module
├── admin/         # Admin module
├── media/         # Media service (used by multiple modules)
└── websocket/     # WebSocket gateway

# Frontend
frontend/app/
├── (auth)/        # Auth screens
├── (app)/         # App screens
│   ├── memories/
│   ├── social/
│   ├── postcards/
│   └── profiles/
```

---

## Development Workflow

### Adding a New Feature (Example: Create Memory)

**1. Map to architecture** (use [07-REQUIREMENTS-MAPPING.md](07-REQUIREMENTS-MAPPING.md))

Memory creation is **UC4** → `memories/` module → `POST /memories`

**2. Create entity** (following [05-IMPLEMENTATION-PATTERNS.md](05-IMPLEMENTATION-PATTERNS.md) Section 4)

```typescript
// src/memories/entities/memory.entity.ts
@Entity("memories")
export class MemoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  user_id: string; // ✅ snake_case column names

  @Column("geography", { spatialFeatureType: "Point", srid: 4326 })
  location: Point;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;
}
```

**3. Create DTOs** (following Section 3)

```typescript
// src/memories/dto/create-memory.dto.ts
export class CreateMemoryDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  lat: number;
}

// src/memories/dto/memory-response.dto.ts
export class MemoryResponseDto {
  id: string;
  userId: string;
  createdAt: Date;
}
```

**4. Create repository** (following Section 5)

```typescript
// src/memories/repositories/memory.repository.ts
@Injectable()
export class MemoryRepository {
  async create(createMemoryDto: CreateMemoryDto): Promise<MemoryEntity> {
    return this.dataSource.getRepository(MemoryEntity).save(createMemoryDto);
  }
}
```

**5. Create service** (following Section 5)

```typescript
// src/memories/memories.service.ts
@Injectable()
export class MemoriesService {
  constructor(private readonly repository: MemoryRepository) {}

  async createMemory(dto: CreateMemoryDto): Promise<MemoryResponseDto> {
    const memory = await this.repository.create(dto);
    return memory; // TypeORM automatically maps to DTO
  }
}
```

**6. Create controller** (following Section 5 & [04-CORE-DECISIONS.md](04-CORE-DECISIONS.md) Decision 7)

```typescript
// src/memories/memories.controller.ts
@Controller("memories")
@UseGuards(AuthGuard) // ✅ All routes authenticated
export class MemoriesController {
  constructor(private readonly service: MemoriesService) {}

  @Post()
  async createMemory(@Body() dto: CreateMemoryDto) {
    const memory = await this.service.createMemory(dto);
    return {
      success: true, // ✅ Consistent envelope
      data: memory,
      meta: { timestamp: new Date().toISOString() }
    };
  }
}
```

**7. Add tests** (following Section 7)

```typescript
// src/memories/test/memories.service.spec.ts
describe("MemoriesService", () => {
  let service: MemoriesService;
  let repository: MemoryRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MemoriesService,
        { provide: MemoryRepository, useValue: { create: jest.fn() } }
      ]
    }).compile();

    service = module.get(MemoriesService);
    repository = module.get(MemoryRepository);
  });

  it("should create memory", async () => {
    const dto = { userId: "uuid", lat: 45.5 };
    jest.spyOn(repository, "create").mockResolvedValue({ id: "uuid", ...dto });

    const result = await service.createMemory(dto);
    expect(result.id).toBeDefined();
  });
});
```

**8. Frontend implementation** (same patterns)

```typescript
// frontend/services/api/memories.api.ts
export const createMemory = async (dto: CreateMemoryDto) => {
  const response = await apiClient.post("/memories", dto);
  return response.data.data; // Extract data from envelope
};

// frontend/app/(app)/memories/capture.tsx
export default function CaptureScreen() {
  const handleCreate = async (formData) => {
    const memory = await createMemory(formData);
    // Navigate to memory detail
  };
}
```

---

## Consistency Checklist (Before Submitting PR)

**Copy & paste this into your PR template:**

- ✅ Database: All table/column names lowercase snake_case
- ✅ API: Routes use plural nouns (`/memories` not `/memory`)
- ✅ API: All responses use `{ success, data, meta }` envelope
- ✅ Code: camelCase variables/functions, PascalCase classes
- ✅ DTOs: Named `Create{Entity}Dto`, `Update{Entity}Dto`, not generic `{Entity}Dto`
- ✅ Services: No database queries outside repository
- ✅ Controllers: No business logic, only HTTP handling
- ✅ Errors: Using GlobalExceptionFilter with semantic error codes
- ✅ Dates: All timestamps ISO 8601 format (`2025-12-19T10:30:45Z`)
- ✅ Tests: Unit tests mock dependencies; integration tests use real DB

---

## Common Questions

### Q: Where do I put API authentication?

**A:** Use `@UseGuards(AuthGuard)` on controller or method. AuthGuard is in `common/guards/` and checks JWT from `Authorization: Bearer {token}` header or HttpOnly cookie.

### Q: How do I handle pagination?

**A:** Use query parameters: `?page=1&limit=20`. Return envelope with `pagination: { page, pageSize, total }`.

### Q: Where should I put a shared utility?

**A:** In `common/utils/` if it's used by multiple modules. Never duplicate code between modules.

### Q: How do I add a new role?

**A:** Update `src/common/enums/role.enum.ts` and `@Roles()` decorator usage. RBAC roles are: User, Moderator, Admin.

### Q: How do I handle soft deletes?

**A:** Add `deleted_at` column to entity. All queries automatically filter with `deleted_at IS NULL` via a global scope (use TypeORM `@DeleteDateColumn()`).

### Q: Can I add a circular dependency?

**A:** No. Auth is foundational (all modules depend on it). Media is shared (memories, social, postcards depend on it). Admin depends on all. No other circular dependencies allowed.

### Q: How do I know if I need async/await?

**A:** All database queries and S3 operations are async. All controller methods should be `async`.

### Q: Where do I call external APIs (S3, etc.)?

**A:** In a dedicated `service` file within the module (e.g., `memories.media.service.ts`). Never in controller.

---

## File Naming Convention Quick Reference

| Type           | Example                    | Location                     |
| -------------- | -------------------------- | ---------------------------- |
| Entity         | `memory.entity.ts`         | `src/memories/entities/`     |
| Repository     | `memory.repository.ts`     | `src/memories/repositories/` |
| Service        | `memories.service.ts`      | `src/memories/`              |
| Controller     | `memories.controller.ts`   | `src/memories/`              |
| DTO (Request)  | `create-memory.dto.ts`     | `src/memories/dto/`          |
| DTO (Response) | `memory-response.dto.ts`   | `src/memories/dto/`          |
| Test           | `memories.service.spec.ts` | `src/memories/test/`         |
| Guard          | `auth.guard.ts`            | `src/common/guards/`         |
| Pipe           | `validation.pipe.ts`       | `src/common/pipes/`          |
| Filter         | `exception.filter.ts`      | `src/common/filters/`        |

---

## Useful Commands

```bash
# Generate new NestJS module
nest g module memories
nest g controller memories
nest g service memories

# Run backend
npm run start:dev

# Run tests
npm run test
npm run test:watch
npm run test:cov

# Build for production
npm run build

# Frontend development
expo start

# Build web export
expo export --platform web
```

---

## Where to Find Things

| I need to...                   | Go to...                                                       |
| ------------------------------ | -------------------------------------------------------------- |
| Understand a requirement       | [07-REQUIREMENTS-MAPPING.md](07-REQUIREMENTS-MAPPING.md)       |
| Find an API endpoint           | [04-CORE-DECISIONS.md](04-CORE-DECISIONS.md) Decision 7        |
| Implement code                 | [05-IMPLEMENTATION-PATTERNS.md](05-IMPLEMENTATION-PATTERNS.md) |
| Understand RBAC                | [06-PROJECT-STRUCTURE.md](06-PROJECT-STRUCTURE.md)             |
| Check tech versions            | [03-STARTER-TEMPLATES.md](03-STARTER-TEMPLATES.md)             |
| See all decisions              | [04-CORE-DECISIONS.md](04-CORE-DECISIONS.md)                   |
| Understand project constraints | [02-PRODUCT-PRINCIPLES.md](02-PRODUCT-PRINCIPLES.md)           |
| Plan database schema           | [01-PROJECT-CONTEXT.md](01-PROJECT-CONTEXT.md)                 |

---

**Status:** Ready to code! Follow patterns, maintain consistency, implement with confidence.

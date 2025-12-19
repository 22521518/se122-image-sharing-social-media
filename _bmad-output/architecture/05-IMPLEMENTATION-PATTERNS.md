---
title: "Implementation Patterns & Consistency Rules"
project: "se122-image-sharing-social-media"
date: "2025-12-19"
status: "Enforced"
---

# Implementation Patterns & Consistency Rules

> **Navigation:** See [00-INDEX.md](00-INDEX.md) for the complete architecture guide.

## Overview

These patterns prevent AI agents from making incompatible code decisions. They define **how** agents should implement, not **what** they should implement.

**Critical conflict points addressed:**

- Database naming (lowercase snake_case vs other conventions)
- API endpoint naming (plural vs singular resources)
- Code naming (camelCase vs snake_case vs PascalCase)
- Project structure (modular organization)
- Error handling (consistent error envelopes)
- Request/response formats (DTOs, timestamps)

---

## 1. NAMING PATTERNS

### Database Naming — STRICTLY lowercase snake_case

**Why:** PostgreSQL convention, easier in migrations, consistent with TypeORM defaults.

**Rules:**

- Table names: `users`, `memories`, `postcards`, `reports` (lowercase, plural)
- Column names: `user_id`, `created_at`, `updated_at` (snake_case)
- Foreign keys: `user_id` (NOT `fk_user_id` or `UserId`)
- Indexes: `idx_memories_location`, `idx_users_email` (NOT `MemoriesLocationIndex`)
- Constraints: `uc_memories_id_per_user` (unique constraints prefixed `uc_`)

**Examples:**

```sql
-- ✅ CORRECT
CREATE TABLE memories (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
CREATE INDEX idx_memories_location ON memories USING GIST(location);

-- ❌ WRONG
CREATE TABLE Memories (
  Id UUID,
  UserId UUID,
  Location GEOGRAPHY
);
```

---

### API Naming — Plural resource nouns, camelCase parameters

**Rules:**

- Resources: `/memories`, `/postcards`, `/social/posts` (plural)
- Route parameters: `:id` (lowercase, not `:memoryId`)
- Query parameters: `?userId=uuid&limit=20` (camelCase)
- HTTP methods: POST (create), GET (read), PATCH (update), DELETE (delete)

**Examples:**

```
✅ CORRECT
GET    /memories
POST   /memories
GET    /memories/:id
PATCH  /memories/:id
DELETE /memories/:id
GET    /memories?userId=uuid&limit=20
POST   /social/posts/:id/like
DELETE /social/posts/:id/like

❌ WRONG
GET    /memory                          (singular)
GET    /Memories/:id                    (capitalized)
GET    /memories?user_id=uuid           (snake_case param)
```

---

### Code Naming — camelCase for TypeScript/JavaScript

**Rules:**

- Variables: `userId`, `memoryId`, `createdAt` (camelCase)
- Functions: `getUserData`, `createMemory`, `isExpired` (camelCase, verb-first)
- Classes/Interfaces: `UserEntity`, `MemoryRepository`, `MemoriesService` (PascalCase)
- Files: `users.service.ts`, `memory.repository.ts`, `create-memory.dto.ts` (kebab-case)
- Constants: `MAX_UPLOAD_SIZE`, `DEFAULT_CACHE_TTL` (UPPER_SNAKE_CASE)

**Examples:**

```typescript
// ✅ CORRECT
export class MemoriesService {
  async getUserMemories(userId: string, limit: number = 20): Promise<Memory[]> {
    const cacheKey = `memories:${userId}`;
    return this.cacheService.get(cacheKey) || this.repository.find({ userId });
  }
}

// ❌ WRONG
export class MemoriesService {
  async get_user_memories(userId: string, Limit: number) {
    const CacheKey = `memories:${userId}`;
  }
}
```

---

## 2. PROJECT STRUCTURE PATTERNS

### NestJS Backend Structure

```
backend/src/
├── main.ts                              # Application entry
├── app.module.ts                        # Root module
├── auth/                                # Module per domain
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── dto/
│   │   ├── register.dto.ts
│   │   └── login.dto.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── roles.guard.ts
│   └── test/
│       └── auth.service.spec.ts        # Tests co-located
├── memories/
│   ├── memories.controller.ts
│   ├── memories.service.ts
│   ├── memories.module.ts
│   ├── entities/
│   │   └── memory.entity.ts
│   ├── repositories/
│   │   └── memory.repository.ts
│   ├── dto/
│   └── test/
├── social/
│   ├── posts/
│   ├── feed/
│   └── social.module.ts
├── moderation/
├── admin/
├── common/                              # Shared across modules
│   ├── exceptions/
│   ├── filters/
│   ├── interceptors/
│   ├── decorators/
│   ├── guards/
│   └── pipes/
└── config/
```

**Key Rules:**

- **One module per domain** (auth, memories, social, moderation, admin)
- **No circular dependencies** (auth cannot import from memories)
- **Shared code in `common/`** (never duplicate guards, exception handling, decorators)
- **Tests live alongside code** (`*.spec.ts` in same directory)

---

### Expo Frontend Structure

```
frontend/cross-platform/
├── app/                                 # File-based routing
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (app)/
│   │   ├── _layout.tsx                  # Tab navigator
│   │   ├── memories/
│   │   │   ├── index.tsx                # Living Map
│   │   │   └── [id].tsx
│   │   ├── social/
│   │   └── admin/
│   └── _layout.tsx                      # Root layout
├── components/
│   ├── auth/
│   ├── memories/                        # By feature domain
│   ├── social/
│   └── common/
├── screens/                             # Screen containers (logic)
├── services/                            # API clients & business logic
│   ├── api/
│   │   ├── client.ts
│   │   ├── memories.api.ts
│   │   └── auth.api.ts
│   ├── storage/
│   └── types/
├── hooks/
├── utils/
├── constants/
├── context/                             # React Context (one per domain)
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
└── __tests__/                           # Parallel test structure
```

**Key Rules:**

- **Screens handle data; Components are presentational**
- **API calls only in services, never in components**
- **One context per domain** (not monolithic AppContext)
- **Tests mirror source structure**

---

## 3. API FORMAT PATTERNS

### Request/Response Envelope (all responses)

```typescript
// SUCCESS (200, 201)
{
  "success": true,
  "data": { /* actual response */ },
  "meta": { "timestamp": "2025-12-19T10:30:45Z" }
}

// PAGINATED
{
  "success": true,
  "data": [ /* array */ ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}

// ERROR (4xx, 5xx)
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email already exists"
  },
  "meta": { "timestamp": "2025-12-19T10:30:45Z" }
}
```

---

### DTO Naming & Structure

**Rules:**

- Request: `Create{Entity}Dto`, `Update{Entity}Dto`, `Filter{Entity}Dto`
- Response: `{Entity}ResponseDto` (or use entity with `@Exclude()`)

**Examples:**

```typescript
// ✅ CORRECT
export class CreateMemoryDto {
  @IsUUID()
  userId: string;

  @Type(() => Number)
  @IsNumber()
  lat: number;
}

export class MemoryResponseDto {
  id: string;
  userId: string;
  createdAt: Date;

  @Exclude()
  deletedAt?: Date; // Never expose internal fields
}

// ❌ WRONG
export class MemoryDto {
  // Not specific (Create vs Update?)
  Id: string; // Not camelCase
  UserID: string; // Inconsistent casing
}
```

---

### Date/Time Format — ISO 8601 only

**Rule:** All timestamps are ISO 8601 strings in APIs.

```typescript
// ✅ CORRECT
{ "createdAt": "2025-12-19T10:30:45Z" }

// ❌ WRONG
{ "createdAt": 1766222445000 }           // Unix timestamp
{ "createdAt": "12/19/2025" }            // Not ISO 8601
```

---

## 4. DATABASE ENTITY PATTERNS

### TypeORM Entity Conventions

```typescript
// ✅ CORRECT
@Entity("memories")
export class MemoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  user_id: string;

  @ManyToOne(() => UserEntity, (user) => user.memories)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column("geography", { spatialFeatureType: "Point", srid: 4326 })
  location: Point;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "timestamp", nullable: true })
  deleted_at?: Date; // Soft delete
}

// ❌ WRONG
@Entity("Memories") // Not lowercase
export class MemoriesEntity {
  @Column()
  UserId: string; // Not snake_case

  @Column()
  createdAt: Date; // Not snake_case
}
```

---

## 5. SERVICE & REPOSITORY PATTERNS

### Three-Layer Architecture: Repository → Service → Controller

```typescript
// REPOSITORY (data access only)
@Injectable()
export class MemoriesRepository {
  async findById(id: string): Promise<MemoryEntity | null> {
    return this.dataSource
      .getRepository(MemoryEntity)
      .findOne({ where: { id, deleted_at: IsNull() } });
  }
}

// SERVICE (business logic)
@Injectable()
export class MemoriesService {
  constructor(
    private readonly repository: MemoriesRepository,
    private readonly cacheService: CacheService
  ) {}

  async getMemory(id: string): Promise<MemoryResponseDto> {
    const cached = await this.cacheService.get(`memory:${id}`);
    if (cached) return cached;

    const memory = await this.repository.findById(id);
    if (!memory) throw new NotFoundException("Memory not found");

    await this.cacheService.set(`memory:${id}`, memory, 300);
    return memory;
  }
}

// CONTROLLER (HTTP handling only)
@Controller("memories")
export class MemoriesController {
  constructor(private readonly service: MemoriesService) {}

  @Get(":id")
  async getMemory(@Param("id") id: string) {
    return this.service.getMemory(id);
  }
}
```

**Key Rules:**

- **Repository:** Query layer ONLY, no business logic
- **Service:** Business logic, orchestration, caching, transactions
- **Controller:** HTTP request/response handling, DTO validation

---

## 6. ERROR HANDLING PATTERNS

### Global Exception Filter (all errors use same envelope)

```typescript
// All errors return consistent format
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: HttpArgumentsHost) {
    const response = host.getResponse<Response>();

    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let message = "Internal server error";

    if (exception instanceof BadRequestException) {
      statusCode = 400;
      errorCode = "INVALID_INPUT";
    } else if (exception instanceof NotFoundException) {
      statusCode = 404;
      errorCode = "NOT_FOUND";
    }

    response.status(statusCode).json({
      success: false,
      error: { code: errorCode, message },
      meta: { timestamp: new Date().toISOString() }
    });
  }
}

// Usage in services
throw new BadRequestException({
  code: "DUPLICATE_EMAIL",
  message: "Email already registered"
});
```

---

## 7. TESTING PATTERNS

### Unit Tests (co-located with source)

```typescript
// src/memories/test/memories.service.spec.ts
describe("MemoriesService", () => {
  let service: MemoriesService;
  let repository: MemoriesRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MemoriesService,
        { provide: MemoriesRepository, useValue: { findById: jest.fn() } }
      ]
    }).compile();

    service = module.get<MemoriesService>(MemoriesService);
    repository = module.get<MemoriesRepository>(MemoriesRepository);
  });

  it("should return memory by id", async () => {
    const mockMemory = { id: "uuid", userId: "uuid" };
    jest.spyOn(repository, "findById").mockResolvedValue(mockMemory);

    const result = await service.getMemory("uuid");
    expect(result).toEqual(mockMemory);
  });
});
```

### Integration Tests (controller + service + real DB)

```typescript
describe("MemoriesController (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [MemoriesModule, DatabaseModule]
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it("POST /memories should create memory", async () => {
    const dto: CreateMemoryDto = { userId: "uuid", lat: 45.5, lng: -122.6 };

    const response = await request(app.getHttpServer())
      .post("/memories")
      .send(dto)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });
});
```

**Key Rules:**

- **Unit tests:** Mock dependencies, test business logic isolation
- **Integration tests:** Real DB (in-memory or test container), real HTTP layer
- **File location:** `test/` directory parallel to source

---

## 8. ENFORCED CONSISTENCY CHECKLIST

**All AI agents implementing stories MUST follow:**

- ✅ **Database:** lowercase snake_case (tables, columns, indexes)
- ✅ **API:** Plural nouns, camelCase parameters, `success/data/meta` envelope
- ✅ **Code:** camelCase functions/vars, PascalCase classes, kebab-case files
- ✅ **DTOs:** Create/Update/Filter{Entity}Dto naming, `@Exclude()` for sensitive fields
- ✅ **Services:** No business logic in controllers; no DB queries outside repositories
- ✅ **Errors:** Use GlobalExceptionFilter, semantic error codes, consistent envelope
- ✅ **Tests:** Unit + integration, 1 test file per source file, parallel structure
- ✅ **Dates:** ISO 8601 strings in APIs (never Unix timestamps)
- ✅ **Responses:** Always `{ success, data, meta }`
- ✅ **Dependencies:** No circular imports (auth → memories OK; memories → auth NOT OK)

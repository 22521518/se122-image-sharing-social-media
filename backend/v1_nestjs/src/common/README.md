# Common Module

Shared utilities, filters, interceptors, and guards for the NestJS application.

## 🚫 Rules & Boundaries
- **LEAF NODE**: This module is a leaf node in the dependency graph.
- **NO DOMAIN IMPORTS**: It must NEVER import from feature modules (Auth, Memories, etc.).
- **STRICTLY SHARED**: Only generic code used by multiple domains belongs here.

## 📂 Components

### Exceptions & Filters
- `GlobalExceptionFilter`: Standardizes all error responses into `{ success: false, error: { ... } }`.

### Interceptors
- `ResponseInterceptor`: Standardizes success responses into `{ success: true, data: ... }`.

### Guards
- Shared guards (e.g., global auth utilities) will live here.

# AGENTS.md - Services Layer

## Responsibility
This directory contains the bridge between the Frontend and the Backend API.

## Critical Implementation Rules

### 1. DTO Pattern (MANDATORY)
*   **Input**: API calls must accept typed arguments or DTOs.
*   **Output**: API calls must return `Promise<ApiResponse<DTO>>` or just `Promise<DTO>` if the interceptor unwraps it.
*   **Location**: Define DTOs in `src/types/` (or `types/` at root).

### 2. ApiService Usage
*   **Do not use `fetch` directly.** Use the exported `api` instance from `api.service.ts`.
*   **Reason**: `api.service.ts` handles:
    *   Base URL injection.
    *   JWT Token attachment (Interceptor).
    *   Standard error parsing.

### 3. Error Handling
*   Services should throw structured errors that the UI can catch or let the global error handler manage.
*   **Network Errors**: Handle offline states gracefully where possible.

### 4. Mocking
*   When the backend is unimplemented, create a `*.mock.ts` file or usage a flag to return mock data.

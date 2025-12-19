# Media Module Agent Rules

## Dependency Rules
1.  **Role**: Service Provider.
2.  **Forbidden Dependencies**: This module must **NOT** know about `Users`, `Memories`, `Social`, or any other business domain. It is a dumb pipe for files.
3.  **Imports**: Can import `Common`.
4.  **Reverse Dependencies**: Business modules (e.g., `Memories`) import `MediaModule` to use file services.

## Architecture
- `MediaService` should be generic. Method signatures should use generic keys or file objects, not "UserAvatar" or "MemoryPhoto".

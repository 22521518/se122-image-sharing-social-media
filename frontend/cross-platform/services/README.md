# Services

API Client implementations.

| Service | Description |
|---------|-------------|
| `api.service.ts` | Base Axios configuration and interceptors. |
| `users.service.ts` | User profile, settings, and search. |
| `social.service.ts` | Posts, feed, likes, comments, follows. |
| `media.service.ts` | File uploads (images, audio). |
| `postcards.service.ts` | Time-locked postcards logic. |
| `moderation.service.ts` | Reporting content. |

## Usage
```typescript
import { socialService } from '@/services/social.service';

const posts = await socialService.getFeed();
```

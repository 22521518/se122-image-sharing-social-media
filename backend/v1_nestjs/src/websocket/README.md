# Websocket Module

Real-time notification infrastructure for the LifeMapped application.

## Overview

This module provides WebSocket connectivity for push notifications using Socket.IO. It's designed for server-to-client notifications only — not for request/response patterns.

## Installation

Dependencies are already included in the project:
- `@nestjs/websockets`
- `@nestjs/platform-socket.io`
- `socket.io`

## Usage

### Importing the Module

The WebsocketModule is imported into AppModule:

```typescript
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
})
export class AppModule {}
```

### Emitting Notifications

Inject `NotificationsGateway` into your service:

```typescript
import { NotificationsGateway } from '../websocket/notifications.gateway';

@Injectable()
export class PostcardsService {
  constructor(private readonly notifications: NotificationsGateway) {}

  async unlockPostcard(postcardId: string, userId: string) {
    // ... unlock logic
    
    // Notify the user in real-time
    this.notifications.emitToUser(userId, 'postcard:unlocked', {
      postcardId,
      unlockedAt: new Date(),
    });
  }
}
```

### Client Connection

Clients connect to the `/notifications` namespace:

```typescript
// Frontend (React Native / Web)
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  auth: { token: 'jwt-token-here' },
});

socket.on('postcard:unlocked', (data) => {
  console.log('Postcard unlocked!', data);
});
```

## Events

| Event | Description | Payload |
|-------|-------------|---------|
| `postcard:unlocked` | A time-locked postcard has been unlocked | `{ postcardId, unlockedAt }` |
| `notification:new` | Generic notification | `{ type, message, data }` |
| `memory:shared` | A memory was shared with the user | `{ memoryId, sharedBy }` |

## Configuration

CORS is currently set to allow all origins. For production, configure appropriately:

```typescript
@WebSocketGateway({
  cors: {
    origin: ['https://app.lifemapped.com'],
    credentials: true,
  },
})
```

## Architecture Decisions

- **Decision 13**: Real-time features use WebSocket for push notifications only
- **No Request/Response**: All queries go through REST API, WebSocket is push-only

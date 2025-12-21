# Websocket Module - Agent Context

## Module Purpose

Real-time notification infrastructure for the LifeMapped application.

## Rules for AI Agents

### ✅ DO

- Use WebSocket ONLY for server-to-client push notifications (side effects)
- Validate JWT tokens in connection handshake before allowing subscriptions
- Use namespaces to separate notification concerns (e.g., `/notifications`, `/postcards`)
- Emit events for: postcard unlocks, new follower, likes, comments, memory shares
- Log connection/disconnection events for debugging

### ❌ DO NOT

- Use WebSocket for request/response patterns (use REST instead)
- Store sensitive data in socket payloads
- Allow unauthenticated connections to subscribe to user-specific events
- Create circular dependencies with other modules

## Event Naming Convention

Use `domain:action` format:
- `postcard:unlocked`
- `notification:new`
- `memory:shared`
- `follow:received`

## Integration Pattern

```typescript
// Other modules inject NotificationsGateway to emit events
constructor(private readonly notificationsGateway: NotificationsGateway) {}

// Emit when something noteworthy happens
this.notificationsGateway.emitToUser(userId, 'postcard:unlocked', { postcardId });
```

## References

- [Architecture Decision 13](file:///d:/Code/SE122/se122-image-sharing-social-media/_bmad-output/architecture/01-PROJECT-CONTEXT.md#Decision-13-Real-Time-Notifications)

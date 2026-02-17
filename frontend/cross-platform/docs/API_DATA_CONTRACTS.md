# API Data Contracts

> **Integration Contract**
> This document defines the exact shape of data returned by the backend API and used by the frontend services.

---

## Social Data

### Post Detail
`GET /api/social/posts/:id`
```ts
interface PostDetail {
  id: string
  content: string
  createdAt: string // ISO Date
  updatedAt: string // ISO Date
  likeCount: number
  commentCount: number
  liked: boolean
  author: {
    id: string
    name: string | null
    avatarUrl: string | null
  }
}
```

### Comment
`GET /api/social/comments/:targetId`
```ts
interface Comment {
  id: string
  content: string
  createdAt: string // ISO Date
  updatedAt: string // ISO Date
  isOwner: boolean
  author: {
    id: string
    name: string | null
    avatarUrl: string | null
  }
}
```

### Feed Response
`GET /api/social/feed`
```ts
interface FeedResponse {
  posts: PostDetail[]
  nextCursor: string | null
  hasMore: boolean
}
```

### Search Results
`GET /api/social/search`
```ts
interface SearchResponse {
  users: {
    id: string
    name: string | null
    avatarUrl: string | null
    bio: string | null
  }[]
  posts: PostDetail[]
  hashtags: {
    id: string
    tag: string
    postCount: number
  }[]
}
```

---

## Memories Data

### Memory
`GET /api/memories`
`GET /api/memories/map`
```ts
interface Memory {
  id: string
  userId: string
  type: 'voice' | 'photo' | 'mixed' | 'text_only'
  mediaUrl: string | null // Audio URL for voice, Image URL for photo
  duration?: number // Seconds
  latitude: number
  longitude: number
  privacy: 'private' | 'friends' | 'public'
  title?: string
  feeling?: 'JOY' | 'MELANCHOLY' | 'ENERGETIC' | 'CALM' | 'INSPIRED'
  createdAt: string // ISO Date
  updatedAt: string // ISO Date

  // Social & Stats
  likeCount: number
  commentCount: number
  liked?: boolean

  // Metadata for pure CSS rendering (no media)
  placeholderMetadata?: {
    gradientId: string
    feeling: string
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    capturedAt?: string
  }
  
  // Creator Info
  user?: {
    id: string
    name: string | null
    avatarUrl: string | null
  }
}
```

---

## Postcards Data

### Postcard
`GET /api/postcards/:id`
```ts
interface Postcard {
  id: string
  senderId: string
  recipientId: string
  status: 'DRAFT' | 'LOCKED' | 'UNLOCKED'
  message?: string
  mediaUrl?: string
  
  // Unlock Conditions
  unlockDate?: string // ISO Date
  unlockLatitude?: number
  unlockLongitude?: number
  unlockRadius?: number
  
  viewedAt?: string // ISO Date
  createdAt: string // ISO Date
  
  sender?: {
    id: string
    name: string
    avatarUrl?: string
  }
  recipient?: {
    id: string
    name: string
    avatarUrl?: string
  }
}
```

---

## User Data

### Profile
`GET /api/users/profile`
```ts
interface Profile {
  id: string
  email: string
  name: string | null
  bio: string | null
  avatarUrl: string | null
  defaultPrivacy?: string
  hasOnboarded?: boolean
  createdAt?: string
}
```

### User Settings
`GET /api/users/settings`
```ts
interface UserSettings {
  defaultPrivacy: string
  privacySettings: Record<string, unknown> | null
}
```

---

## Moderation Data

### Report Response
`POST /moderation/reports`
```ts
interface ReportResponse {
  id: string
  targetType: 'POST' | 'COMMENT' | 'USER'
  targetId: string
  reason: 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER'
  description: string | null
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
  message: string
}
```

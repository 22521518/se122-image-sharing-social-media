# Social Module

## Role
This module handles user interactions and content discovery. To ensure maintainability, it is split into **subdomains** rather than having a monolithic "SocialService".

## Subdomains
- **Feed**: Logic for generating user feeds (following/algorithm).
- **Posts**: Management of social posts (captions, multiple images).
- **Discovery**: Search and recommendations (e.g., "Trending Nearby").
- **Profiles**: User public profiles, following/followers graph.

## Dependencies
- **AuthModule**: For user identity.
- **MediaModule**: For post content.
- **Memories**: Linked via ID reference to avoid direct heavy coupling.

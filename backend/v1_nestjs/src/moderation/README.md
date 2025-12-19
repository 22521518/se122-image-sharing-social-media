# Moderation Module

## Role
This module handles **Content Safety**, including Reporting, Automated Scanning, and Manual Review.

## Workflows
1.  **Reporting**: Users flag content (Post, Comment, Profile). A `Report` entity is created.
2.  **Automated Scanning**: (Future) AI or Keyword scan. Can auto-hide or flag for review.
3.  **Manual Review**: Moderators (RBAC) access a queue to "Keep" or "Take Down" content.

## Dependencies
- **AuthModule**: RBAC (Moderator role check).
- **Social/Memories/Media**: To reference the content being reported.

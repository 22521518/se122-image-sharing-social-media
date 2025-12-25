# Social Components

Reusable UI components for social interactions (Posts, Likes, Comments, Following).

## Components

| Component | Description |
|-----------|-------------|
| `PostCard` | Main feed item displaying user info, media, and action buttons. |
| `LikeButton` | Heart icon with toggle state and animation. |
| `CommentList` | Vertical list of comments for a post or memory. |
| `CommentInput` | Text input field with submit button for adding new comments. |
| `DoubleTapLike` | Wrapper that detects double-taps to trigger a "like" action. |
| `FollowButton` | Button to toggle follow status of a user. |
| `ImageGalleryEditor` | UI for selecting and previewing images during post creation. |

## Usage
Most components expect an `postId` or `memoryId` and interact with the `SocialContext` or `social.service`.

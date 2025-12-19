# Social Module Agent Rules

## Dependency Rules
1.  **Circular References**: Be extremely careful with `Memories` module. Prefer referencing by ID.
2.  **No Monolith**: Do NOT put everything in one `SocialService`. Use `FeedService`, `ProfileService`, etc.
3.  **Imports**:
    - `Auth`
    - `Media`
    - `Common`

## Data Structure
- Profile data (bio, avatar) belongs here (in `profiles` subdomain), separate from Auth credentials.

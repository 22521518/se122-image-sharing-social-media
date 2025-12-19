# Admin Module Agent Rules

## Dependency Rules
1.  **Omnipotent**: Admin is allowed to import services from almost any other module to gather statistics or perform management actions.
2.  **One-Way**: Other modules (except perhaps Auth) should **NOT** depend on Admin. Admin sits at the top of the consumption chain.
3.  **Imports**:
    - `Auth`
    - `Common`
    - `Memories` (for stats)
    - `Social` (for stats)
    - `Media` (for stats)

## Security
- NEVER expose Admin endpoints to public internet without strict authentication AND IP allow-listing (if applicable).

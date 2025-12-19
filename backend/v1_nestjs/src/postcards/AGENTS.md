# Postcards Module Agent Rules

## Dependency Rules
1.  **Role**: Top-Level Domain.
2.  **Independence**: Independent of `Memories` module. Postcards have their own lifecycle and entities.
3.  **Imports**:
    - `Auth`
    - `Media`
    - `Common`

## Architecture
- Separate tables from Memories.
- Distinct API endpoints.

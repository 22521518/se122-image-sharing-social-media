# Memories Module

## Role
This is the **Core Domain** module of the application. It manages "Memories" (user-created content tied to a location) and acts as the **Source of Truth for the Map**.

## Domain Entities
### Memory
- **ID**: UUID.
- **Creator**: Relation to User (Auth module).
- **Location**: PostGIS `geography(Point, 4326)`.
- **Media**: Array of media resource keys/URLs (Media module).
- **Content**: Caption, feelings, stickers.
- **Visibility**: User-defined rules.

## Geo-Spatial Requirements
- **Database**: PostgreSQL with PostGIS extension.
- **Column Type**: `geography` (not `geometry`) for accurate distance calculations on a sphere.
- **Indexing**: GiST index on the location column for fast spatial queries (e.g., "Find memories within 500m").

## Dependencies
- **AuthModule**: To link memories to creators.
- **MediaModule**: To handle photo/audio attachments.
- **CommonModule**: Shared utilities.

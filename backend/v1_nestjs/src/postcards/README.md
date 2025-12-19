# Postcards Module

## Role
This module manages **Time-Locked Postcards**. These are digital assets sent to a specific location (or user at a location) that remain "Locked" until specific conditions are met (Time + Proximity).

## State Machine
1.  **Created**: Postcard created, content uploaded, target location/time set.
2.  **Locked**: Default state. Content is hidden/encrypted (logically protected).
3.  **Unlockable**: Conditions (Time elapsed) met. Visible on map if near?
4.  **Unlocked**: User visits location. Content revealed.
5.  **Delivered**: User opens/collects the postcard.

## Logic
- **Time-Lock**: Cannot be opened before `unlock_date`.
- **Location-Trigger**: Cannot be opened unless user `current_location` is within `radius` of `target_location`.

## Dependencies
- **AuthModule**: Sender/Receiver identity.
- **MediaModule**: Content storage.
- **CommonModule**: Shared tools.

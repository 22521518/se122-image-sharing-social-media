# Life Mapped - User Flow Specifications

This document details the step-by-step interactions for the core "magic moments" of the Life Mapped experience.

---

## 1. The Locket Ritual (Capture Flow)

The "Locket Ritual" is the primary way users capture memories. It is designed to be intentional, tactile, and rewarding.

```mermaid
sequenceDiagram
    participant U as User
    participant A as App (Map View)
    participant C as Camera/Audio Service
    participant S as Storage/API

    U->>A: Long-press "The Locket" button
    A->>A: Trigger Haptic (Medium)
    A->>A: Show Blurred Camera Preview Overlay
    A->>C: Initialize Camera & Mic
    A->>A: Display Glowing Red Ring & 5s Timer

    loop Recording (2-5 seconds)
        U->>A: Continue holding button
        C->>A: Stream Audio Levels
        A->>A: Animate Waveform & Pulse Ring
    end

    U->>A: Release Button (after 2s)
    A->>A: Trigger "Shutter Flash" (White Overlay)
    A->>A: Trigger Haptic (Heavy)
    C->>A: Capture Photo + Audio Clip
    A->>A: Show "Anchoring..." Animation
    A->>S: Upload Media + GPS Metadata
    S-->>A: Success Confirmation
    A->>A: Show Pin dropping on Map
    A->>A: Return to Map View
```

### Key Interaction States:

- **Pre-Capture:** Map is active, Locket button is idle.
- **Active Recording:** Screen is focused on the ritual; map is obscured.
- **Post-Capture:** Brief "success" state before returning to the map.

---

## 2. The Teleport Experience (Discovery Flow)

Teleportation is the serendipitous way users rediscover their past.

```mermaid
sequenceDiagram
    participant U as User
    participant A as App (Map View)
    participant S as API/Database
    participant M as Map Engine

    U->>A: Tap "Teleport" FAB
    A->>S: Request Random Memory (Non-repeating)
    S-->>A: Return Memory Data (Lat/Lng, Photo, Audio)

    A->>A: Trigger "Shutter Flash" Transition
    A->>M: Rapid Pan/Zoom to Target Location

    par Playback
        A->>A: Show Memory Card Overlay
        A->>A: Play Voice Sticker Audio
    end

    U->>A: Tap "Close" or Map
    A->>A: Dismiss Overlay
    A->>A: Stay at new Map Location
```

### Key Interaction States:

- **The Jump:** The high-speed map movement combined with the visual flash.
- **The Reveal:** The moment the audio starts playing and the photo appears.

---

## 3. Time-Locked Postcard (Sending Flow)

Creating a "gift" for the future or a friend.

```mermaid
flowchart TD
    Start([Start: Tap 'Create Postcard']) --> SelectMedia[Select Memory or Capture New]
    SelectMedia --> ChooseType{Lock Type?}
    ChooseType -- Time --> SetDate[Select Unlock Date/Time]
    ChooseType -- Location --> SetLoc[Select Unlock Radius on Map]
    SetDate --> ChooseRecipient[Select Recipient: Self or Friend]
    SetLoc --> ChooseRecipient
    ChooseRecipient --> Confirm[Confirm & 'Seal' Postcard]
    Confirm --> Success([Postcard Sent/Stored])
```

### Key Interaction States:

- **The Seal:** A satisfying animation (like closing a locket or wax seal) to confirm the lock.
- **The Locked State:** Recipient sees a "Locked" placeholder until conditions are met.

# Project PRD v2 — Life Mapped

**Status:** Draft / Revised
**Date:** 2025-12-19
**Author:** Mary (Business Analyst)
**Source:** PRD v1 + Design Thinking Session (2025-12-18)

---

## 1. Executive Summary

**Life Mapped** is a private-first, web-first (PWA) memory preservation tool designed for reflective individuals. Unlike traditional social media that prioritizes virality and performance, Life Mapped focuses on the "Locket Metaphor"—a sacred, personal space to anchor intimate life moments to geographic locations. The core experience centers on "Voice Stickers" (2-5s audio) and a "Teleport" mechanic for serendipitous rediscovery.

## 2. Product Principles (The Soul of Life Mapped)

- **Human Agency:** No auto-generated memories. The user is the curator.
- **Intimacy over Reach:** Private-by-default. No social performance pressure.
- **The Locket Metaphor:** A personal space that "opens you back" when you open it.
- **Beauty as Utility:** The map is an art piece, not just a database.
- **Scarcity & Meaning:** Rediscovery should feel like a gift.

## 3. Target Audience

- **Primary:** "Nostalgic Nomads" (20-35) who have experienced significant life transitions (moving, studying abroad) and want to track their emotional trajectory.
- **Persona:** Reflective, private individuals who value long-term meaning over instant novelty.

## 4. Functional Requirements

### F1: The "Voice Sticker" Capture (MVP Core)

- **Description:** The atomic unit of memory. 2-5 seconds of raw, unscripted audio attached to a location and photo.
- **Requirements:**
  - One-tap recording (low friction).
  - Automatic location/time metadata extraction from photos (EXIF).
  - Manual pin placement for "feeling-first" entries.
  - Support for "Voice-only" pins with beautiful generative placeholders.

### F2: The Living Map & Teleportation

- **Description:** A fluid, map-centric navigation that moves "backward into meaning."
- **Requirements:**
  - **Teleport Button:** A "Random Access Memory" button that jumps the user to a random, non-repeating memory.
  - **Memory Filmstrip:** A scrollable/swipeable timeline of memories tied to the current map view.
  - **Shutter Transition:** A 0.2s visual "flash" during teleportation to simulate a camera shutter.

### F3: Bulk-Drop Wall (Web-First Strategy)

- **Description:** Effortless uploading of historical memories.
- **Requirements:**
  - Drag-and-drop photo clusters onto the web interface.
  - Local browser-side EXIF extraction to suggest pin locations.
  - Batch "Voice Sticker" ritual to add emotional context to imported photos.

### F4: Time-locked Postcards (Phase 1.5)

- **Description:** Compose a photo+message with an unlock condition (date or revisit location).
- **Requirements:**
  - Locked state persists until condition is met.
  - Can be sent to self or a trusted friend.

## 5. Non-Functional Requirements

- **NF1: Privacy:** Private-by-default. Granular sharing controls (Private/Friends/Public).
- **NF2: Performance:** Map interactions <200ms. Instant audio playback (2-5s clips).
- **NF3: Web-First (PWA):** Optimized for desktop and mobile browsers before native development.
- **NF4: Data Sovereignty:** Easy export of all media and metadata.

## 6. Success Metrics

- **"The Shiver" Factor:** Qualitative feedback on emotional resonance of 3s voice clips.
- **Teleport Engagement:** Frequency of "Teleport" usage vs. manual map browsing.
- **Annotation Depth:** % of pins with a Voice Sticker vs. photo-only.

## 7. Implementation Roadmap

- **Phase 1 (MVP):** Web-first capture (Voice Stickers), Teleport button, Living Map, Bulk-Drop Wall.
- **Phase 1.5:** Time-locked Postcards, Ambient Memory Widget.
- **Phase 2:** Native Mobile App, Soundscape Navigation, "Ghost Pins" (EXIF history).

---

_This document supersedes PRD v1._

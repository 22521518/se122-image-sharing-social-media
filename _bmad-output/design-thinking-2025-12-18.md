# Design Thinking Session: Life Mapped

**Date:** 2025-12-18
**Facilitator:** Maya (Design Thinking Maestro)
**Design Challenge:**

- **Problem:** Intimate, personal memories are often lost or buried under the noise of social media platforms optimized for performance, virality, and public engagement.
- **Users:** Reflective, private individuals (20-35) who have experienced significant life transitions (moving cities, studying abroad) and value long-term personal meaning over social reach.
- **Constraints:** Small team execution, no dependency on social network effects, private-by-default architecture. **Web-First Strategy:** Develop and test core features on Web/PWA before moving to native Mobile.
- **Success:** Users experience a "wow" moment when seeing their life trajectory mapped geographically and emotionally, leading to deep personal utility and verbal (not social) advocacy.

---

## 🎯 Design Challenge

**Challenge Statement:**
"How might we help reflective, private individuals (20-35) preserve and relive their most intimate, location-tied memories so they can track their life's emotional trajectory without the pressure of social performance?"

### 📜 Product Principles (The Soul of Life Mapped)

- **No auto-generated memories in MVP:** The user is the curator; agency belongs to the human, not the algorithm.
- **User chooses what matters:** Intimacy is born from intention.
- **Beauty reduces anxiety:** The map is an art piece, not a database.
- **Data serves emotion, never leads it:** We use technology to anchor feelings, not to replace them.
- **Scarcity creates meaning:** Teleportation should feel like a gift, not a repetitive loop.
- **The Locket Metaphor:** "A locket you sometimes open — and it opens you back."

---

## 👥 EMPATHIZE: Understanding Users

### User Insights

- **Primary Direction:** Relive memories + Track life through places.
- **Core Emotional Promise:** "Keep the moments that would otherwise quietly disappear."
- **Target Persona:** Reflective, private individuals (20-35), often "nostalgic nomads" (moved cities, studied abroad).
- **Exclusions:** No "Discover new places" (Google Maps), no "Social-first sharing" (Instagram/TikTok).

### Key Observations

- **The "Empty Map" Problem:** Solved via Sally's "Feeling-first" onboarding.
- **Onboarding Ritual:** Start with a human question (e.g., "Where did you feel most at home last year?"), write/speak the feeling, anchor to place, reveal the map with beautiful placeholders if no photo exists.
- **Ghost Pins (EXIF):** Explicitly deferred to Phase 2 to avoid "creepy" surveillance vibes.
- **Daily Rituals:** Deferred to Day 2+ as retention mechanics.

### Empathy Map Summary

- **Says:** "I don't want to perform for likes, I just want to remember this café."
- **Thinks:** "My life is moving so fast, I'm losing the small details of where I've been."
- **Does:** Takes photos but they get lost in a 10,000-image camera roll.
- **Feels:** Nostalgic, slightly overwhelmed by public social media, seeking a "sacred space" for reflection.

### 🎨 DEFINE: Frame the Problem

### Point of View Statement

"A **reflective, private individual** needs a way to **capture and relive intimate life moments** because **existing social platforms prioritize performance and instant novelty over long-term personal meaning**, causing meaningful memories to disappear into digital noise."

### How Might We Questions

- **How Might We** make the act of 're-consuming' one's own past feel as gratifying as consuming new content?
- **How Might We** use 'Raw Voice' (2-5s) to create an instant emotional bridge to a past version of ourselves?
- **How Might We** design a 'Map-first' navigation that feels as effortless as a TikTok scroll but moves 'backward' into meaning instead of 'forward' into novelty?

### Key Insights

- **The "Gratification" Pivot:** In this app, gratification isn't "What's new?", it's **"How did I feel?"**. It's the dopamine hit of _self-recognition_.
- **Micro-Voice (2-5s):** Shorter than a breath, just a "vibe check." It's the "Locket" of personal memory—instant, raw, and low-friction.
- **The "Locket" Lesson:** Ease of use is king. The "upload" must be as fast as a shutter click, and the "consumption" must be as fluid as a swipe, even if it's just for yourself.

---

## 💡 IDEATE: Generate Solutions

### Selected Methods

- **Metaphor Mapping:** "The Locket" and "The Time Machine."
- **Crazy 8s:** Rapidly exploring "Teleport" UI variations.
- **Analogous Inspiration:** Learning from "Locket" (speed/simplicity) and "TikTok" (fluidity of consumption).

### Generated Ideas

- **Voice Stickers (2-5s):** The atomic unit of memory. Raw, unscripted, instant.
- **Teleport / Shuffle:** A "Time Travel" button that jumps the user to a random, non-repeating memory.
- **Bulk-Drop Memory Wall:** Drag-and-drop photo clusters to auto-create pins based on EXIF data, followed by a "Voice Sticker" ritual.
- **Feeling-First Onboarding:** Starting with a question, not a camera.
- **Ambient Memory Widget:** A daily "whisper" from the past (Phase 1.5).
- **Soundscape Navigation:** Subtle audio echoes while moving the map (Future).

### Top Concepts

1. **The Voice Sticker:** 2-5 seconds of raw reality. The "Shiver" generator.
2. **The Teleport Button:** Active "Random Access Memory" navigation.
3. **The Bulk-Drop Wall:** Effortless web-first uploading via drag-and-drop and EXIF extraction.
4. **The Living Map:** A visual art piece of one's life trajectory.

---

## 🛠️ PROTOTYPE: Make Ideas Tangible

### Prototype Approach

- **Low-Fidelity Wireframes:** Focus on the "One-Tap" capture and the "Teleport" transition.
- **Wizard of Oz:** Testing the emotional impact of 3-second voice clips with users.

### Prototype Description

- **MVP v1 (Web-First):** A responsive web application (PWA) featuring a private map with "Voice Stickers" and a "Shutter Teleport" button.
- **Onboarding:** A single feeling-based prompt leading to the first pin.
- **Interaction:**
  - **Teleport:** Tap/Click the 'Compass' button, use `Spacebar`, or **Scroll Wheel Click** to 'Snap.'
  - **Explore:** Drag map, use `Arrow Keys`, or **Mouse Scroll** to scrub through the 'Memory Filmstrip.'
  - **Capture:** Click-and-hold on map, use `V` key, or **Drag-and-Drop** images to create memories.
  - **Transition:** Instant 0.2s shutter transition with immediate 2-5s voice playback.

### Key Features to Test

- **The "Shiver" Factor:** Does a 3s raw voice clip cause emotional recognition?
- **Teleport Friction:** Does random jumping feel like a gift or a loss of control?
- **Onboarding Clarity:** Does starting with a question feel natural or confusing?

---

## ✅ TEST: Validate with Users

### Testing Plan

- **Target:** 5-7 "Nostalgic Nomads" (20-35).
- **Method:** Wizard of Oz. Show a map, play a 3s raw voice clip of a past memory.
- **Goal:** Measure "The Shiver" (emotional resonance) vs. "The Noise" (distraction).

### User Feedback

- _Pending initial pilot._

### Key Learnings

- _Pending initial pilot._

---

## 🚀 Next Steps

### Refinements Needed

- Finalize the "Shutter" visual asset (0.2s flash).
- Define the "Placeholder" generative art style for no-photo pins.
- Draft the technical spec for local EXIF extraction in-browser.

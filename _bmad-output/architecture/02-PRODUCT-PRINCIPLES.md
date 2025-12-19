---
title: "Product Principles & Architectural Enforcement"
project: "se122-image-sharing-social-media"
date: "2025-12-19"
status: "Locked"
---

# Product Principles & Architectural Enforcement

> **Navigation:** See [00-INDEX.md](00-INDEX.md) for the complete architecture guide.

These principles are **not** design guidelines; they are architectural constraints that must be enforced at the API and data model layers:

1. **"Ship the Mirror, Not the Movers"**

   - Core product value derives from Voice Sticker capture + Teleport rediscovery, not from onboarding logistics.
   - Bulk import is a utility for V1, not a feature. No Review & Repair UI, no pending state surfaces, no operational expansion of the import flow.

2. **"Memories Gain Gravity Through Voice, Not Coordinates"**

   - When a user extracts a memory from the Cloud of Unknowing or creates a new memory without location, the **audio-first extraction rule** applies:
     - Do NOT prompt for location first.
     - Do NOT ask for metadata.
     - **Immediately prompt for voice.**
   - This semantic ordering reinforces that voice is the truth, location is the anchor.

3. **"Unplaced Memories Are Visually Acknowledged But Never Operationally Expanded"**
   - The Cloud of Unknowing exists as a visual affordance to reduce onboarding anxiety, not as a product surface or destination.
   - Hard rule: "The Cloud must never be a place you spend time."
   - See dedicated section below for strict behavioral constraints.

---

## Architecture Decision: The Cloud of Unknowing

### Purpose

- Reduce onboarding anxiety from bulk imports with missing or corrupted EXIF data.
- Preserve aesthetic coherence of the Locket experience.
- Avoid introducing repair or metadata-fixup workflows in V1.

### What the Cloud Is (Technical Definition)

A **single aggregated visual element** representing all unplaced memories:

- **Rendering model:**
  - Single aggregated entity (not N individual pins rendered).
  - SVG or canvas overlay with CSS blur / radial gradient aesthetic.
  - O(1) render cost regardless of import size.
- **Data model:**
  - Unplaced memories have `geo = null` and are excluded from PostGIS spatial index.
  - Tracked in the Memory Pin table but logically segregated.
- **Performance guarantee:**
  - No reflow tied to map pan/zoom operations.
  - No worker complexity; fully client-side aggregation.
  - Does not touch frame budget if kept aggregated.

### Explicit Non-Goals (What the Cloud Is NOT)

The Cloud of Unknowing is **explicitly not**:

- Browsable
- Sortable
- Editable
- Explorable beyond a single reveal gesture
- A product surface for future expansion

**Architectural enforcement:** Any feature work that attempts to expand the Cloud (e.g., "let users organize unplaced photos into categories") is **blocked by principle** and must be escalated as a new epic, not a modification to Epic 3.

### User Interaction Constraints (Hard Rules)

1. **One tap/click reveals a count and a single line of copy:**

   - Copy example: "10 memories waiting for location. Capture a voice to place one, or tap Teleport to rediscover."

2. **The only suggested next actions are:**

   - "Capture a voice to place one" (audio-first extraction rule applies).
   - "Teleport" (to the main magic loop).

3. **No scrolling. No grid. No dopamine.**
   - The Cloud does not become a secondary destination or reward mechanism.

### Stress-Test: Semantic Leakage Prevention

**The question answered:** Does the Cloud invite curiosity—or defer meaning indefinitely?

- **Desired outcome:** The Cloud becomes a psychological parking lot ("I'll deal with that later"), not a substitute destination.
- **Signal that we got it wrong:** Users spend meaningful time in the Cloud, or report that the Cloud is their primary interaction with imported photos.
- **Telemetry to track:** Time spent viewing the Cloud reveal, frequency of accessing vs. Teleporting, and whether users extract from the Cloud vs. creating new Voice Stickers. If Cloud extraction becomes >30% of voice entry points, the semantic framing has failed.

---

## Audio-First Extraction Rule (Locked for V1)

When a user pulls a memory out of the Cloud or creates a new memory without an existing location:

**Flow (in order):**

1. Display the memory (photo or generative placeholder if voice-only).
2. **Immediately prompt: "Add a voice to anchor this memory."**
3. Only after voice is recorded: offer location confirmation/adjustment (if EXIF exists) or manual placement.

**Why this order matters architecturally:**

- Reinforces that **voice is the semantic anchor**, not location.
- Ensures every memory has a voice clip (or empty voice state), which is required for Teleport playback.
- Prevents the flow from devolving into a metadata fixup form.
- Defaults the user behavior toward the core product value.

**API implication:** The `POST /api/memories/upload` endpoint must support:

- Photo + metadata first.
- Voice added in a follow-up PATCH or separate `POST /api/memories/:id/voice`.
- Status progression: `draft` (no voice) → `published` (has voice, may have location).

---

## Decision Summary

✅ **Approved:** Cloud of Unknowing as a constrained, non-interactive system element.  
✅ **Locked:** Audio-first extraction rule for unplaced memories.  
✅ **Enforced:** Product principles block future semantic expansion of the Cloud.  
✅ **Telemetry:** Defined success metrics to detect semantic leakage.

**Roadmap Impact:**

- Epic 3 (Bulk Import Lite) scope reduced; no Review & Repair UI.
- Reclaimed ~2 weeks of dev/QA time, redirected to Teleport and Voice latency optimization.
- Unplaced memory state (`geo = null`) requires only a database schema addition and aggregate rendering logic, not a UI surface.

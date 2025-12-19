# Life Mapped - Design Handoff Specification

This document provides the technical design specifications for the **Modern Locket** visual direction. It is intended for designers and developers to ensure high-fidelity implementation.

## 1. Color Palette (The Midnight Vault)

| Role                   | Hex Code                | Tailwind Class    | Usage                            |
| :--------------------- | :---------------------- | :---------------- | :------------------------------- |
| **Background**         | `#0F172A`               | `bg-slate-900`    | Primary app background           |
| **Surface (Glass)**    | `rgba(30, 41, 59, 0.6)` | `bg-slate-800/60` | Cards, Modals, Overlays          |
| **Primary (Ink Blue)** | `#2563EB`               | `bg-blue-600`     | Locket core, Active states       |
| **Accent (Glow)**      | `#60A5FA`               | `text-blue-400`   | Icons, Highlights, Pulse effects |
| **Alert (Recording)**  | `#EF4444`               | `bg-red-500`      | Active recording state           |
| **Text (Primary)**     | `#F8FAFC`               | `text-slate-50`   | Headings, Body text              |
| **Text (Secondary)**   | `#94A3B8`               | `text-slate-400`  | Metadata, Captions               |

---

## 2. Typography (Geist System)

We use the **Geist** font family for its technical precision and high legibility in PWA environments.

- **Font Family:** `Geist, ui-sans-serif, system-ui, sans-serif`
- **Scale:**
  - **H1 (Screen Titles):** `24px / 1.5 / SemiBold` (`text-2xl font-semibold`)
  - **H2 (Section Headers):** `18px / 1.5 / Medium` (`text-lg font-medium`)
  - **Body (Standard):** `16px / 1.6 / Regular` (`text-base`)
  - **Metadata (Small):** `12px / 1.4 / Regular / Tracking-wide` (`text-xs tracking-wide`)

---

## 3. Component Specifications

### A. The Locket Button

- **Dimensions:** `64px x 64px` (Mobile) / `80px x 80px` (Desktop)
- **Border Radius:** `9999px` (Full circle)
- **Background:** `linear-gradient(180deg, #2563EB 0%, #1E40AF 100%)`
- **Shadow:** `0 0 20px rgba(37, 99, 235, 0.4)`
- **Interaction:**
  - **Long-press (0.5s):** Trigger recording.
  - **Recording State:** Inner circle (`32px`) appears in `#EF4444` with a `pulse` animation.

### B. The Voice Sticker (Map Marker)

- **Dimensions:** `48px x 48px`
- **Border:** `2px solid #FFFFFF`
- **Shadow:** `0 4px 6px rgba(0, 0, 0, 0.3)`
- **Content:** Center-cropped photo thumbnail.
- **Overlay:** Small audio-wave icon in bottom-right corner (`16px`).

### C. Glassmorphic Panels

- **Background:** `rgba(15, 23, 42, 0.7)`
- **Backdrop Blur:** `12px` (`backdrop-blur-md`)
- **Border:** `1px solid rgba(255, 255, 255, 0.1)`

---

## 4. Motion & Transitions

| Interaction         | Duration | Easing                         | Effect                           |
| :------------------ | :------- | :----------------------------- | :------------------------------- |
| **Teleport Spin**   | `1200ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | Map rotation + Zoom              |
| **Shutter Flash**   | `200ms`  | `ease-out`                     | White overlay opacity 0.8 -> 0   |
| **Sticker Expand**  | `300ms`  | `ease-in-out`                  | Scale 1.0 -> 1.2 + Label fade-in |
| **Recording Pulse** | `1000ms` | `infinite`                     | Scale 1.0 -> 1.1 (Glow only)     |

---

## 5. Asset Requirements

- **Icons:** Lucide-react or Heroicons (Outline style, 2px stroke).
- **Map Style:** Mapbox "Dark" or "Midnight" custom layer.
- **Haptics:**
  - **Start Recording:** `Medium` impact.
  - **Capture Success:** `Heavy` impact.
  - **Error:** `Double-tap` light impact.

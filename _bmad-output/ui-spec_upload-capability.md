# UI Specification: Media Upload Capability

**Project:** Life Mapped
**Version:** 1.0
**Status:** Designer-Ready

---

## 1. Backend Context (API Contract Assumptions)

The UI assumes a robust backend service with the following capabilities. These constraints directly influence the UI's state management and feedback loops.

### API Capabilities

- **Endpoint:** `POST /api/v1/media/upload`
- **Payload:** `Multipart/form-data` supporting single or multiple files.
- **Metadata Extraction:** Backend automatically extracts EXIF data (GPS, Timestamp) and returns it in the response.
- **Progress Events:** Supports `onUploadProgress` hooks for real-time percentage tracking.
- **Resumable Uploads:** (Preferred) Supports chunked uploads for large files or unstable networks.
- **Validation:** Returns specific error codes for:
  - `413 Payload Too Large` (File size limit)
  - `415 Unsupported Media Type` (Invalid format)
  - `403 Forbidden` (User quota exceeded)
- **Response Object:**
  ```json
  {
    "id": "uuid",
    "status": "processing | success | error",
    "metadata": {
      "name": "sunset.jpg",
      "size": 2048000,
      "type": "image/jpeg",
      "location": { "lat": 45.5, "lng": -122.6 },
      "timestamp": "2025-12-19T12:00:00Z"
    }
  }
  ```

---

## 2. UI Scope Definition

### A. Core User Flows

#### 1. First-Time Upload (Empty State)

- **User Intent:** Start building their "Life Map" by adding their first memory.
- **System Feedback:** A welcoming, low-friction "Bulk-Drop Wall" or "Map Overlay".
- **State Transition:** Empty State → Drag-Over → Uploading.

#### 2. Single File Upload

- **User Intent:** Add a specific moment (photo/video) to a location.
- **System Feedback:** Immediate thumbnail preview and progress bar.
- **State Transition:** Idle → Selecting → Uploading → Success.

#### 3. Multi-File / Bulk Upload

- **User Intent:** Import a "cluster" of memories (e.g., from a trip).
- **System Feedback:** A list or grid view showing individual progress for each file.
- **State Transition:** Idle → Batch Selecting → Batch Uploading → Summary View.

#### 4. Drag-and-Drop Interaction

- **User Intent:** Intuitive "drop" of files onto the map or wall.
- **System Feedback:** Visual "Drop Zone" activation (dimming background, dashed borders).
- **State Transition:** Idle → Drag-Over (Active) → Drop (Processing).

#### 5. Upload in Progress

- **User Intent:** Monitor the status of their upload.
- **System Feedback:** Real-time progress bars, "Processing EXIF" spinner, and "Add Voice Sticker" prompt (ritual).
- **State Transition:** Uploading (X%) → Processing Metadata.

#### 6. Partial Failure

- **User Intent:** Understand why some files failed and what to do next.
- **System Feedback:** List view highlighting failed items with specific error messages (e.g., "File too large").
- **State Transition:** Batch Uploading → Partial Success (Warning State).

#### 7. Full Failure

- **User Intent:** Recover from a network drop or system error.
- **System Feedback:** Global error notification with a "Retry All" action.
- **State Transition:** Uploading → Error State.

#### 8. Upload Success Confirmation

- **User Intent:** Verify the memory is "anchored" to the map.
- **System Feedback:** Success toast and visual "ping" on the map at the extracted location.
- **State Transition:** Processing → Success (Anchored).

#### 9. Retry / Cancel Behavior

- **User Intent:** Stop an accidental upload or fix a failed one.
- **System Feedback:** Immediate cessation of network activity and removal of the file item from the list.
- **State Transition:** Uploading/Error → Idle/Removed.

---

### B. Component Inventory

#### 1. Drop Zone (Composite)

- **Purpose:** The primary landing area for file interactions.
- **States:** Default (Hidden/Passive), Hover (Active/Highlighted), Disabled (During full-screen upload).
- **Content Rules:** Clear instructional text ("Drop memories here"), icon usage (Upload cloud).
- **Accessibility:** `aria-dropeffect`, keyboard focus for manual file picker trigger.

#### 2. Upload Button (Atomic)

- **Purpose:** Manual trigger for file selection.
- **States:** Default, Hover, Active, Loading (Spinner), Disabled.
- **Content Rules:** Short, action-oriented text ("Add Memory").

#### 3. File Item Row / Card (Composite)

- **Purpose:** Represents a single file in the upload queue.
- **States:** Default, Uploading, Success, Error.
- **Content Rules:** Thumbnail (if image), Filename (truncated if long), Size, Status Label.
- **Accessibility:** Screen reader should announce "Uploading [filename], 45% complete".

#### 4. Progress Indicator (Atomic)

- **Purpose:** Visual representation of upload percentage.
- **States:** Determinate (0-100%), Indeterminate (Processing).
- **Content Rules:** Semantic colors (Neutral for progress, Success for 100%).

#### 5. Error Message Block (Atomic)

- **Purpose:** Explain why an upload failed.
- **States:** Default.
- **Content Rules:** Concise, non-technical language ("File type not supported").

#### 6. Success State Indicator (Atomic)

- **Purpose:** Confirm completion.
- **States:** Default.
- **Content Rules:** Checkmark icon, "View on Map" link.

#### 7. Action Buttons (Atomic)

- **Purpose:** Control the upload lifecycle (Retry, Remove, Cancel).
- **States:** Default, Hover, Disabled.
- **Content Rules:** Icon-only for rows (X, Refresh), Text for bulk actions.

#### 8. Empty State Illustration (Composite)

- **Purpose:** Guide the user when no memories exist.
- **Content Rules:** "The Locket" metaphor imagery, encouraging copy.

#### 9. Toast / Inline Notifications (Composite)

- **Purpose:** High-level feedback for batch operations.
- **States:** Success, Warning, Error.

---

### C. Interaction & Motion Concepts

- **Drag-Over Affordance:** When a file is dragged over the window, the map should dim by 40% and a "Drop to Anchor" dashed border should scale in slightly (1.02x).
- **Upload Progress Feedback:** Progress bars should use a "spring" animation for smooth movement, avoiding jerky jumps between percentage updates.
- **Transition Rules:**
  - **File List:** Items should slide up from the bottom or fade in sequentially.
  - **Success:** A 0.2s "Shutter Flash" (white overlay at 10% opacity) when a file is successfully anchored to the map, simulating the "Life Mapped" camera metaphor.
- **Motion Intent:** Motion exists to provide **reassurance** (uploading), **celebration** (success), and **focus** (drag-over).

---

## 3. Responsive & Layout Guidance

- **Desktop:**
  - Bulk uploads appear in a **Side Panel** (right-aligned) to keep the Map visible.
  - Full-screen drag-and-drop support.
- **Tablet:**
  - Split-screen view: Map on top, Upload Queue on bottom.
- **Mobile:**
  - Upload Queue is a **Bottom Sheet** that can be collapsed to a "Status Bar".
  - "Add Memory" is a Floating Action Button (FAB).
- **Touch vs. Mouse:**
  - Minimum touch target: 44x44px.
  - Swipe-to-remove gesture for file items in the mobile queue.
- **Bulk Behavior:** On small screens, the file list collapses into a "X files uploading" summary with a "View Details" expander.

---

## 4. Design System Hooks

### Color Roles (Semantic)

- **Primary:** Brand color for "Add Memory" and active states.
- **Success:** For completed uploads and "Anchored" status.
- **Error:** For failed uploads and validation warnings.
- **Warning:** For partial failures or "Low Storage" alerts.
- **Neutral/Muted:** For progress bar backgrounds and metadata text.
- **Overlay:** Semi-transparent dark for drag-over states.

### Typography Roles

- **Heading:** "Upload Memories" (Bold, Large).
- **Label:** Filenames (Medium, Truncated).
- **Metadata:** File size, status (Small, Muted).
- **Feedback:** Error messages (Small, High Contrast).

### Spacing & Density

- **Stacking:** 8px gap between file items (Standard).
- **Grouping:** 24px padding for the upload container.
- **Density Modes:**
  - _Comfortable:_ For desktop side panels.
  - _Compact:_ For mobile bottom sheets and bulk lists.

### Component Variants vs Modifiers

- **Button Variants:** `Primary` (Solid), `Secondary` (Outline), `Ghost` (Text-only for Cancel).
- **File Item Modifiers:** `--is-uploading`, `--has-error`, `--is-success`, `--has-voice-sticker`.

### Reusable Patterns

- **Progress-Based Operations:** The progress bar and status label pattern should be reusable for other long-running tasks (e.g., "Exporting Map Data").
- **The "Ritual" Prompt:** A pattern for secondary actions during a primary process (e.g., adding a Voice Sticker while the photo uploads).

---

## 5. Edge Cases & Non-Happy Paths

| Scenario             | User Experience                                                 | System Action                                                            |
| :------------------- | :-------------------------------------------------------------- | :----------------------------------------------------------------------- |
| **Network Drop**     | Progress bar pauses; "Waiting for connection" label appears.    | System attempts to resume 3 times before showing "Retry" button.         |
| **Unsupported Type** | File item appears with a red border and "Invalid Format" label. | File is rejected before network request starts (Client-side validation). |
| **Exceeding Limits** | Toast notification: "Total batch exceeds 50MB".                 | Prevents "Upload All" action until items are removed.                    |
| **Backend Timeout**  | Item shows "Server not responding" with a Retry icon.           | Logs the error; keeps the file in the queue for manual retry.            |
| **Navigating Away**  | Browser "Confirm Navigation" dialog if uploads are active.      | Warns user that progress will be lost.                                   |

---

## 6. Success Criteria for Design

A designer can consider this task complete when:

1.  **Components:** All states (Default, Hover, Active, Error, Success) are defined for the Drop Zone and File Items.
2.  **Responsive:** A clear plan exists for how the "Bulk-Drop Wall" translates from a 27" monitor to a 6" phone.
3.  **Ritual:** The "Voice Sticker" prompt is integrated into the upload flow without feeling intrusive.
4.  **Accessibility:** The flow is navigable via keyboard and screen readers provide meaningful status updates.

# Praxis Flame App Icon Integration

Update the in-app brand identity by embedding the uploaded orange-and-black flame icon inside the top navigation bar and the Android app installation modal.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during clarification and govern this update:

- **Confirmed Placement Scope**: Apply the new flame icon **only inside the top app header and the Android install modal**, leaving browser tab favicons and external manifest entries untouched.
- **Confirmed Asset Formatting**: Use the uploaded image asset (`/assets/aistudio/file_000000009c4481fa9b4a0b22fd083e1c_4236ccf4.png`) **exactly as provided** without cropping or altering the image pixels.

---

## 1. Overview & Core Concept

- **What It Does**: Displays the uploaded flame emblem next to the `praxis` wordmark in the sticky top header bar and replaces the placeholder `"P"` badge inside the Android App / PWA installation dialog.
- **Target Audience / Persona**: Users tracking daily focus sessions and habits who want a cohesive, recognizable flame emblem representing streaks and momentum across the app interface.
- **Key Value**: Establishes an immediate visual anchor in the top navigation bar and installation prompt while preserving the exact uploaded artwork.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Top Navigation Bar**: When viewing the workspace on mobile or desktop, the user sees the flame icon aligned to the left of the `praxis` brand title.
  2. **Android Install Modal**: When clicking `GET ANDROID APP`, the modal card displays the flame icon beside `Praxis Android PWA` instead of the generic letter `P` box.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast retro-futuristic dark UI with sharp borders and tactile hardware-inspired surfaces.
  - *Color Palette & Mood*: Deep obsidian (`#0e0f13` / `#000000`) canvas paired with neon flame orange (`#ff3b00`) and emerald green (`#39d353`) status accents.
  - *Typography & Hierarchy*: Chunky pixel display (`font-pixel-chunky`) for the `praxis` brand mark paired with crisp pixel headings (`font-pixel-heading`) and tabular monospace numerals (`JetBrains Mono`) for timers and counters.
  - *Component Styling & Layout*: Compact single-elevation header (`py-2.5 sm:py-3`) with a `28px–32px` (`w-7 h-7 sm:w-8 sm:h-8`) icon container in the navbar and a `36px` (`w-9 h-9`) icon container in the install modal.
- **Interactive Feedback & Motion**: Subtle scale transition (`group-hover:scale-105`) on the header brand lockup when hovered.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Scoped In-App Placement**
  - *Chosen Approach*: Render the uploaded image via `<img>` inside the top header brand lockup and the install modal card.
  - *Why*: Matches the user's explicit preference to update only the in-app header and install modal while keeping the existing browser tab / manifest configuration intact.
  - *Alternatives Considered*: Replacing system-wide favicons and manifest icons (skipped per user selection).
- **Decision 2: Unmodified Asset Rendering**
  - *Chosen Approach*: Reference `/assets/aistudio/file_000000009c4481fa9b4a0b22fd083e1c_4236ccf4.png` directly with `object-contain` / `object-cover` sizing.
  - *Why*: Preserves the exact image file uploaded by the user without synthetic re-encoding or cropping.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────┐
│                     Static Public Asset Store                     │
│  /assets/aistudio/file_000000009c4481fa9b4a0b22fd083e1c_...png    │
└─────────────────┬─────────────────────────────────┬───────────────┘
                  │                                 │
                  ▼                                 ▼
┌───────────────────────────────────┐ ┌─────────────────────────────┐
│        Top Navigation Bar         │ │     Android Install Modal   │
│  [Flame Icon] + "praxis" Wordmark │ │  [Flame Icon] + PWA Details │
└───────────────────────────────────┘ └─────────────────────────────┘
```

- **Data Model & State**: Stateless static asset reference shared between the root navigation header and the `InstallApkModal` view.
- **Interactive Component & State Mapping**:
  - Clicking `GET ANDROID APP` in the top navigation bar sets `isInstallModalOpen = true`, opening the modal where the flame icon is displayed alongside the 1-click install trigger and step-by-step instructions.

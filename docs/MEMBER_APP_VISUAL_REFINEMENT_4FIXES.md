# Member App Visual Refinement — 4 Fixes Report

## A) Files changed

| File | Fixes applied |
|------|----------------|
| **client/src/pages/Dashboard.tsx** | 1 (section headers), 3 (dark mode accents) |
| **client/src/pages/Sessions.tsx** | 1 (section header), 3 (dark mode accents) |
| **client/src/pages/Profile.tsx** | 1 (section header), 2 (radius), 3 (dark mode accents) |
| **client/src/pages/Book.tsx** | 1 (section header), 3 (dark mode accents) |
| **client/src/pages/ProfileSettings.tsx** | 1 (section header) |
| **client/src/pages/Enroll.tsx** | 3 (dark mode accents) |
| **client/src/pages/Login.tsx** | 3 (dark mode card border) |
| **client/src/pages/not-found.tsx** | 3 (dark mode card border) |
| **client/src/components/layout/MobileLayout.tsx** | 4 (bottom nav top accent) |

**Not changed:** Admin app, HeroWithAccent, BrandAccent, index.css (no new tokens), EnrollSuccess (already sufficient dark styling).

---

## B) Exact styling changes for each of the 4 fixes

### 1. Remove accent styling from section headers

**Change:** Removed `border-l-2 border-airborne-teal pl-3` from all section headings so they use typography only.

| Location | Before | After |
|----------|--------|--------|
| Dashboard – "Your Memberships" | `... border-l-2 border-airborne-teal pl-3">Your Memberships` | `...">Your Memberships` |
| Dashboard – "Today's Bookings" | `... border-l-2 border-airborne-teal pl-3">Today's Bookings` | `...">Today's Bookings` |
| Sessions – "My Sessions" | `... border-l-2 border-airborne-teal pl-3">My Sessions` | `...">My Sessions` |
| Profile – "Active Memberships" | `... border-l-2 border-airborne-teal pl-3">Active Memberships` | `...">Active Memberships` |
| Book – "Book Class" | `... border-l-2 border-airborne-teal pl-3">Book Class` | `...">Book Class` |
| ProfileSettings – "Account Settings" | `... border-l-2 border-airborne-teal pl-3">Account Settings` | `...">Account Settings` |

Section headers now use only font weight and color (e.g. `font-semibold text-gray-900 dark:text-gray-100` or existing uppercase/label styles).

---

### 2. Normalize Profile card corner radius

**Change:** Aligned Profile card radius with the rest of the app by replacing `rounded-2xl` / `rounded-xl` with `rounded`.

| Component | Before | After |
|-----------|--------|--------|
| Profile membership rows | `rounded-2xl` | `rounded` |
| Profile Settings button row | `rounded-2xl` | `rounded` |
| Profile Dark Mode row | `rounded-2xl` | `rounded` |
| Profile empty state (no memberships) | `rounded-xl` | `rounded` |

Spacing, padding, and layout are unchanged. Radius now matches Dashboard membership cards, Sessions booking cards, Book session cards, and Enroll plan cards (`rounded`).

---

### 3. Improve dark mode brand accent visibility

**Change:** Added or adjusted `dark:` variants so teal accents stay visible on dark backgrounds without making the UI loud.

- **Card accent borders (left border):**  
  Added `dark:border-l-teal-400` (or `dark:border-teal-400` where only one border is set) on every card that already had `border-l-airborne-teal` / `border-l-2 border-l-airborne-teal` / `border-l-[3px] border-l-airborne-teal`.  
  Applied on: Dashboard (membership cards, empty card, today’s booking cards), Sessions (booking cards), Profile (membership rows, Settings row, Dark Mode row), Book (session cards), Enroll (session rows, plan cards, selected summary, payment card), Login (form card), not-found (card).

- **Active chips / pills:**  
  - Book: branch pills and filter chips — `dark:bg-airborne-teal/20` → `dark:bg-airborne-teal/25`, added `dark:border-teal-400`.  
  - Enroll: class filter chips — same (dark bg tint + `dark:border-teal-400`).

- **Active tab (Sessions):**  
  Added `dark:border-teal-400` to the active tab’s `border-b-2 border-airborne-teal` so the underline reads in dark mode.

- **Badges / labels:**  
  - Dashboard “Active” badge: added `dark:text-teal-300` so text stays clear on dark teal background.  
  - Book session card branch label: added `dark:text-teal-300` to the small teal badge.

- **Enroll selected states:**  
  Class type and plan cards when selected use `border-airborne-teal`; added `dark:border-teal-400` so the selected border is visible in dark mode.

No new tokens; only Tailwind `teal-400` / `teal-300` and existing `airborne-teal` usage. Teal is used for accents only, not full backgrounds.

---

### 4. Bottom navigation top line accent

**Change:** Added a thin gradient line and soft glow on the **top** edge of the bottom nav.

- **Structure:** Inside the `<nav>`, added a non-interactive div (positioned at the top of the nav) plus `relative` on the existing flex container so the line sits above the nav content without affecting layout.
- **Line:**  
  - Height: `h-[2px]`.  
  - Gradient: `bg-gradient-to-r from-airborne-deep via-airborne-teal to-airborne-deep` (left/right deep, center teal).  
  - Opacity: `opacity-90` (light), `dark:opacity-100` (dark).
- **Glow:**  
  - Light: `shadow-[0_0_10px_rgba(4,192,193,0.22)]`.  
  - Dark: `dark:shadow-[0_0_12px_rgba(4,192,193,0.3)]`.  
  Teal (04C0C1) at low opacity so the line has a light shimmer without overpowering the icons.
- **Accessibility:** Div has `aria-hidden` so it’s decorative only.

Result: a subtle, premium top accent that works in light and dark and doesn’t compete with the nav icons.

---

## C) Confirmation that only member-facing UI was changed

- **Member app only:** All edits are in member routes and the shared member layout:  
  `pages/Dashboard.tsx`, `pages/Sessions.tsx`, `pages/Profile.tsx`, `pages/Book.tsx`, `pages/ProfileSettings.tsx`, `pages/Enroll.tsx`, `pages/Login.tsx`, `pages/not-found.tsx`, `components/layout/MobileLayout.tsx`.
- **Admin:** No files under `client/src/admin/` or admin-only components were modified.
- **Shared components:** Only `MobileLayout` (member bottom nav) was changed; no shared design tokens or global styles were added in `index.css`.
- **Logic / layout / responsiveness:** No changes to state, handlers, DOM structure, breakpoints, or responsive classes. Only class names and one decorative div were updated.

---

## D) Manual visual QA checklist

### 1. Section headers (no left accent)

- [ ] **Dashboard:** “Your Memberships” and “Today’s Bookings” have no left border or extra padding; type only.
- [ ] **Sessions:** “My Sessions” has no left accent.
- [ ] **Profile:** “Active Memberships” has no left accent.
- [ ] **Book:** “Book Class” has no left accent.
- [ ] **ProfileSettings:** “Account Settings” has no left accent.

### 2. Profile card radius

- [ ] Profile membership rows use the same corner radius as Dashboard/Sessions/Book cards (visually consistent, not more rounded).
- [ ] Profile “Account Settings” and “Dark Mode” rows match that radius.
- [ ] Profile empty state (“No active memberships”) matches other empty/list cards.

### 3. Dark mode brand accents

- [ ] **Toggle dark mode** (e.g. Profile → Dark Mode) and revisit all member screens.
- [ ] **Card left borders:** Visible teal accent on Dashboard, Sessions, Profile, Book, Enroll, Login, not-found cards.
- [ ] **Book:** Active branch pill and active filter chip clearly teal-tinted with visible border and text.
- [ ] **Enroll:** Active class filter chip and selected class/plan borders visible.
- [ ] **Sessions:** Active tab (Upcoming/Past) has a visible teal underline.
- [ ] **Badges:** “Active” (Dashboard) and branch label (Book) readable and clearly teal in dark mode.
- [ ] Overall dark mode still feels restrained (no large bright teal blocks).

### 4. Bottom nav top accent

- [ ] **Light mode:** Thin gradient line and soft glow along the top of the bottom nav; icons and labels remain primary.
- [ ] **Dark mode:** Same line and glow visible and consistent with the rest of the UI.
- [ ] Line doesn’t shift or cover nav items; tap targets and layout unchanged.

### 5. General

- [ ] No layout shifts or new overflow on mobile/desktop.
- [ ] HeroWithAccent / branded GIF unchanged and still correct in light and dark.
- [ ] Admin app unchanged in appearance and behavior.

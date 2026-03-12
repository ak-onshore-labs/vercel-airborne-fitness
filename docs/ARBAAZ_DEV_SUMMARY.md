# Arbaaz Development Summary

Development work completed on this branch, organized by cycle and UI pass.

---

## Cycle 1 – Core bug fixes and correctness improvements

- **Theme-aware Airborne logo** – Logo switches correctly between light and dark themes.
- **Class type alphabetical sorting** – Class types are displayed in alphabetical order across the app.
- **12-hour time formatting across member screens** – All member-facing times use consistent 12-hour format (e.g. 2:30 PM).
- **Membership expiry display in Profile** – Profile shows membership expiry date clearly.

---

## Cycle 2 – Schedule UX and payment handling

- **Schedule bottom sheet layout refinement** – Improved layout and spacing in the schedule bottom sheet.
- **Horizontal class-type chips** – Class types shown as horizontal chips for easier scanning.
- **In-sheet branch toggle** – Branch selection moved into the schedule sheet for a cleaner flow.
- **Razorpay cancel handling (modal dismiss, fallback timer)** – Proper handling when user cancels Razorpay (modal dismiss and fallback timer to avoid stuck states).
- **Prevent stuck loading state** – Fixes to avoid indefinite loading after payment or navigation.

---

## Cycle 3 – Booking rules and session classification

- **5-minute post-start booking window** – Bookings allowed up to 5 minutes after session start.
- **Backend enforcement in `/api/book` and `/api/join-waitlist`** – Server enforces the 5-minute window for book and join-waitlist.
- **Disabled booking UI for past sessions** – Past sessions cannot be booked; UI disables or hides booking actions.
- **Sessions screen classification using `sessionDate` + `startTime`** – Sessions correctly classified as upcoming/past using `sessionDate` and `startTime`.

---

## Cycle 4 – Admin portal improvements

- **Member ↔ Admin portal switch in header** – Header link to switch between member app and admin portal.
- **Removal of Admin from bottom navigation** – Admin entry removed from member bottom nav to avoid confusion.
- **Admin operational dashboard** – New dashboard focused on day-to-day operations.
- **Metrics for:**
  - active members
  - expiring memberships
  - recently expired memberships
  - today’s bookings
  - capacity insights
  - branch-wise stats
- **Drill-down views for expiring/expired memberships** – Dedicated views to explore expiring and recently expired memberships.

---

## UI Pass 1 – Brand visual accent

- **Added aerial GIF accent component** – Reusable component that shows the aerial fitness GIF.
- **Theme-aware GIF switching** – Light/dark variants of the GIF (e.g. Aerial_Light_Loader, Aerial_Dark_Loader).
- **Top-right hero accent on Dashboard, Sessions, Profile** – Hero area uses the accent in the top-right.
- **Layout fix so accent does not squeeze content** – Accent positioned so main content is not compressed.

---

## UI Pass 2 – Brand refinement

- **Consistent card accent system** – Shared styling for card accents across the app.
- **Chip and pill styling improvements** – Updated chips and pills for consistency and readability.
- **Dark mode accent visibility fixes** – Accents readable and visible in dark mode.
- **Bottom navigation gradient accent** – Bottom nav uses a subtle gradient accent.
- **Subtle shimmer motion on nav seam** – Light shimmer at the nav seam for polish.
- **Premium hover lift + glow on cards** – Cards get a slight lift and glow on hover.

---

## Note

These changes were implemented collaboratively and validated visually for both **light** and **dark** mode to ensure consistent behaviour and appearance across themes.

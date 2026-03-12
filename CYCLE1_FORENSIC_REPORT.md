# Cycle 1 Forensic Debugging Report

## 1. Repo, runtime, and duplicates

- **Project root (current workspace):**  
  `/Users/gadgetzone/Desktop/OnShore/Airborne Fitness/airborne-fitness`

- **Active package.json:**  
  Root `package.json` at that path (name: `rest-express`, scripts include `dev`, `dev:client`, etc.). There is no `client/package.json`; the client is the Vite app under `client/` and is driven from the root.

- **Dev command in use:**  
  From terminal transcript: `npm run dev`  
  Script: `cross-env PORT=5001 DOTENV_CONFIG_PATH=.env NODE_ENV=development nodemon --exec tsx server/index.ts --ext ts,js --watch server --watch shared`  
  So the app is intended to run as a **single process on port 5001**: Express + Vite middleware. The browser is expected to hit `http://127.0.0.1:5001` (or `http://localhost:5001`).

- **Duplicate folders:**  
  Only one project folder under the parent:  
  `/Users/gadgetzone/Desktop/OnShore/Airborne Fitness/airborne-fitness/`  
  No other “Airborne” app folder was found under the same parent that could be run by mistake.

- **Critical runtime finding:**  
  Terminal 5 shows `npm run dev` exiting with **EADDRINUSE** on 127.0.0.1:5001. So the process that was started in that run did **not** become the one serving the app. The server actually serving the app is an **older process** that was already bound to 5001 before the latest code changes. That older process is still running the **old** server code (no Cycle 1 server-side changes). Any API calls (class-types, auth/me, etc.) are therefore coming from that old server.

---

## 2. Actual runtime code paths

### A) Logo

- **Where the logo is rendered (current source):**
  - **Login:** `client/src/pages/Login.tsx` line 76: `<AirborneLogo className="h-24 object-contain" alt="Airborne Aerial Fitness" />`. No raw `<img src="/logo.png">` in this file.
  - **Member app header:** `client/src/components/layout/MobileLayout.tsx` line 29: `<AirborneLogo className="h-10 object-contain" alt="Airborne" />`. No raw `<img>` for the logo in this file.

- **Theme source used by the logo:**  
  `client/src/components/AirborneLogo.tsx` uses `useTheme()` from `@/context/ThemeContext`. It reads `darkMode` and sets `src = darkMode ? logoDark : logoLight`, and uses `key={String(darkMode)}` on the `<img>`.

- **Theme provider and tree:**  
  `client/src/App.tsx`: `ThemeProvider` wraps `MemberProvider` and `Router`. So both Login and the member layout (and thus the header with the logo) are inside `ThemeProvider`. The logo component is therefore using the same theme source as the rest of the app.

- **Conclusion:**  
  In the **current repo**, the logo is rendered only via `AirborneLogo` and that component uses the real theme context. If the running app still shows the light logo in dark mode, the **running client bundle** is either (1) an older bundle that still used a raw `<img src="/logo.png">` and did not use `AirborneLogo`/theme, or (2) the same code but with a cached bundle so the updated `AirborneLogo`/theme logic is not what the browser executes. No duplicate Airborne project was found; the discrepancy is between **on-disk source** and **what is actually run** (old process + possible client cache).

---

### B) Class-type sorting

- **Data source in code:**
  - **Book page chips:** `client/src/pages/Book.tsx` line 72: `apiFetch<ClassTypeOption[]>("/api/class-types")`. On success it does `const sorted = [...r.data].sort((a, b) => a.name.localeCompare(b.name, "en")); setClassTypes(sorted);`. Chips are built as `["My Classes", "All", ...classTypes.map((t) => t.name)]` (line 64).
  - **Enroll page list:** `client/src/pages/Enroll.tsx` line 570: `apiFetch<ClassType[]>("/api/class-types")`. On success it does `const sorted = [...r.data].sort(...); setClassTypes(sorted);` and uses `sorted` for initial selection. `MembershipSelection` renders `classTypes.map(...)` (line 258).

- **API response shape:**  
  `client/src/lib/api.ts`: `data = (await res.json()) as T`. For `apiFetch<ClassTypeOption[]>("/api/class-types")`, the response body is typed as the array itself. The server sends `res.json([...])` (array as root). So `r.data` is that array. The client then sorts `r.data` and sets state; the UI uses that state. So in **current source**, both Book and Enroll use `/api/class-types` and apply client-side alphabetical sort.

- **Live API check (proof of what the running server does):**  
  Request: `GET http://127.0.0.1:5001/api/class-types`  
  Response (first items):  
  `Trampoline Fitness`, `Mat Pilates`, `Kids Aerial Fitness`, `Aerial Fitness`, ...  
  Alphabetical order would be: Aerial Fitness, Kids Aerial Fitness, Mat Pilates, Trampoline Fitness. So the **running server** is returning class types in **non-alphabetical** order.

- **Server-side code in repo:**  
  `server/routes/master-data.ts` (lines 7–10) does:  
  `const sorted = [...types].sort((a, b) => a.name.localeCompare(b.name, "en"));`  
  and sends `res.json(sorted.map(...))`. So the **current repo** would send sorted data. The process that answered the curl is **not** running this version; it is an older process without the sort.

- **Conclusion:**  
  The **actual runtime** is using an old server process. That server does not implement the master-data sort, so the API returns unsorted data. If the **client** were running the current code, the client-side sort in Book and Enroll would still show chips in alphabetical order; the fact that the user still sees unsorted chips implies the **running client** is also not the current code (e.g. cached JS), or the client was never refreshed after pulling the Cycle 1 changes.

---

### C) 12-hour time formatting

- **Member-facing time display in current source:**
  - **Dashboard – Today’s Bookings:** `client/src/pages/Dashboard.tsx` line 97:  
    `{formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)} | {booking.branch}`  
    and the file imports `formatTime12h` from `@/lib/formatTime` (line 7).
  - **Book – session cards:** `client/src/pages/Book.tsx` lines 248–249:  
    `{formatTime12h(session.startTime)}`, `{formatTime12h(session.endTime)}`  
    with import at line 18.
  - **Sessions – booking cards:** `client/src/pages/Sessions.tsx` line 94:  
    `{formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)}`  
    with import at line 17.

- **Utility:**  
  `client/src/lib/formatTime.ts` defines `formatTime12h` (handles "HH:mm" and ISO-like strings with `"T"`). It is used only at display time in JSX; no mutation of fetched data.

- **Conclusion:**  
  In the **current repo**, every member-facing place that shows session/booking times uses `formatTime12h`. If the running app still shows 24h times, the **running client bundle** does not include these changes (e.g. old cached script or an old build being served).

---

### D) Profile → Active Memberships expiry

- **Component that renders Active Memberships:**  
  `client/src/pages/Profile.tsx`. The “Active Memberships” block (lines 32–53) does `Object.entries(user.memberships).map(([name, details]) => ...)`. Each card shows `details.sessionsRemaining`, and (in current source) lines 45–49:  
  `{details.expiryDate && (<p ... data-testid="membership-expiry">Expires {format(new Date(details.expiryDate), "dd MMM yyyy")}</p>)}`.

- **Data source for `user.memberships`:**  
  `client/src/context/MemberContext.tsx`:  
  - On login: `loginWithPayload` receives `payload` (from verify-otp or auth/me) and calls `setUser({ ... memberships: payload.memberships })` (line 109).  
  - On reload: `useEffect` calls `apiFetch<...>('/api/auth/me')` and then `loginWithPayload({ token, ...result.data })` (lines 132–134). So `user.memberships` comes from the **API** (`/api/auth/verify-otp` or `/api/auth/me`).

- **Backend shape (current source):**  
  `server/routes/auth.ts`: For both verify-otp and auth/me, `membershipMap[category]` is set to `{ id, sessionsRemaining, expiryDate }` (e.g. lines 150–154, 221–225). The response includes `memberships: membershipMap`. So the **current server code** does send `expiryDate` per membership.

- **Conclusion:**  
  In the **current repo**, the Profile component renders expiry when `details.expiryDate` is present, and the auth routes include `expiryDate` in each membership. If the running app does not show expiry, either (1) the **running server** is old and might not send `expiryDate`, or (2) the **running client** is old and does not have the expiry JSX, or (3) the test account’s memberships in the DB do not have `expiryDate` set. The code path from API → MemberContext → Profile is correct in source; the gap is between this and what is actually running.

---

## 3. Local verification performed

- **Project root:**  
  `pwd` in workspace: `/Users/gadgetzone/Desktop/OnShore/Airborne Fitness/airborne-fitness`. Single `package.json` at root; no duplicate Airborne folder under parent.

- **Class-types API (live):**  
  `curl -s "http://127.0.0.1:5001/api/class-types"` returned HTTP 200. First names in order: **Trampoline Fitness, Mat Pilates, Kids Aerial Fitness, Aerial Fitness**. So the **running** server does **not** return alphabetically sorted class types. The repo’s `master-data.ts` would sort by name; therefore the responding process is not running the current `master-data.ts`.

- **Server-side sorting in repo:**  
  `server/routes/master-data.ts` and `server/storage.ts` (for plans) contain the sort logic. No other route overwrites this for `/api/class-types`.

- **Frontend imports and usage:**  
  Grep confirms:  
  - Logo: only `AirborneLogo` in Login and MobileLayout; no remaining raw `/logo.png` in those components.  
  - Class types: Book and Enroll both use `apiFetch<...>("/api/class-types")` and sort the result before `setClassTypes`.  
  - Times: Dashboard, Book, Sessions all import and use `formatTime12h` at the only places that display member-facing times.  
  - Profile: uses `details.expiryDate` with a conditional render and `format(..., "dd MMM yyyy")`.

So the **current codebase** is consistent with the intended Cycle 1 behavior; the **running app** is not.

---

## 4. Root-cause report

### A) Why the logo fix did not show

- **Cause:** The **running client** is not the current client code. Either the browser is using a cached bundle (from before AirborneLogo + theme were added), or the app was loaded from a build/process that didn’t include those changes.
- **Supporting facts:** (1) In the repo, the logo is only rendered via `AirborneLogo`, which uses `useTheme().darkMode` and the correct assets. (2) ThemeProvider wraps the whole app, so the logo has access to the same theme. (3) No duplicate project was found. So the only plausible explanation is that the executed JS is an older version that either used a static `<img src="/logo.png">` or an older AirborneLogo that didn’t switch on theme.

### B) Why the sorting fix did not show

- **Cause:** (1) **Server:** The process listening on 5001 is an **old** process. Proof: live `GET /api/class-types` returns **unsorted** names (Trampoline, Mat Pilates, Kids Aerial, Aerial). The current `master-data.ts` sorts before sending; the running server does not. (2) **Client:** Current Book and Enroll both sort the fetched array before setting state. If the UI is still unsorted, the **running client** is not this version (e.g. cached script).

### C) Why the 12h fix did not show

- **Cause:** The **running client** bundle does not include the updated code. In the repo, every member-facing time display uses `formatTime12h` and the utility exists and is correct. There is no other code path that renders raw 24h times in the member UI. So the browser must be running an older bundle that still renders `booking.startTime` / `session.startTime` etc. without formatting.

### D) Why the expiry fix did not show

- **Cause:** Either (1) the **running client** does not have the Profile JSX that conditionally renders “Expires …” from `details.expiryDate`, or (2) the **running server** (old process) does not send `expiryDate` in the auth payload, or (3) the test user’s memberships in the DB don’t have `expiryDate`. In the current repo, the auth routes and Profile code are correct; the gap is again between repo and what is actually running.

---

## 5. Minimum exact patches (to apply after fixing runtime)

These are the minimal code-level truths; they do not fix “running old code.” After ensuring the **correct process** and **uncached client** are used, only add or change code if something is still wrong.

1. **Logo**  
   - No further code change needed in repo. Ensure: (1) Only one server process (kill anything on 5001, then `npm run dev`). (2) Hard refresh or disable cache for the app origin so the client loads the current bundle (with AirborneLogo and theme).

2. **Class-type order**  
   - Server: `server/routes/master-data.ts` already sorts before `res.json(...)`.  
   - Client: Book and Enroll already sort after fetch.  
   - If after restart + refresh the API still returns unsorted data, confirm the running process is the one started from this repo (e.g. add a temporary log in `master-data.ts` and check server logs on request). No extra patch needed in the current files.

3. **12-hour times**  
   - No extra patch. Dashboard, Book, and Sessions already use `formatTime12h` at display. After loading the current client (hard refresh / no cache), times should show in 12h.

4. **Profile expiry**  
   - No extra patch. Profile already renders “Expires …” when `details.expiryDate` is present; auth routes already send `expiryDate`. If expiry still doesn’t show after restart + refresh, (1) confirm `/api/auth/me` response includes `expiryDate` per membership (e.g. Network tab), and (2) confirm the test user has memberships with `expiryDate` in the DB.

---

## 6. Recommended immediate actions (no code edits)

1. **Stop the old server:**  
   Find and kill the process using port 5001 (e.g. `lsof -i :5001` then `kill <pid>`), so that no old Node process is serving the app.

2. **Start a single dev server from this repo:**  
   In the project root run `npm run dev`. Wait until it logs that it’s listening on 5001.

3. **Force the browser to load the latest client:**  
   Open the app at `http://127.0.0.1:5001` (or the URL you use). Do a hard reload (e.g. Cmd+Shift+R / Ctrl+Shift+R) or open in an incognito/private window so no cached JS is used.

4. **Re-test all four items:**  
   Logo (toggle dark mode and check header + login), class-type order (Book and Enroll), 12h times (Dashboard/Book/Sessions), Profile expiry (with a user that has active memberships). If any still fail, then re-check with the same forensic steps (e.g. curl class-types again, inspect auth/me in Network tab, and confirm the tab’s JS is the one that imports `formatTime12h` and `AirborneLogo`).

---

## 7. Optional: temporary debug marker

If you want to **prove** that the browser is running the current bundle (and not cache), you can add a temporary, visible marker only for that purpose:

- **What:** In `client/src/components/AirborneLogo.tsx`, add a visible span next to the logo, e.g.  
  `Cycle1-v1` (or a short random string), so it’s obvious when the new code is loaded.
- **Why:** If after a hard refresh you still don’t see that text, the browser is still not loading the current client. If you see it, you know the client is current and any remaining bug is in logic or data, not cache/process.

Remove the marker once verification is done. Do not add it unless you explicitly want this check.

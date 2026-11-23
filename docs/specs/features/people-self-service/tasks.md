# Task Breakdown: Time, attendance and leave in Ever Teams

> Ordered, granular tasks derived from `plan.md`. Each task is small enough to land in
> one PR and ships with tests per Constitution Principle IX.

**Feature ID**: `people-self-service`
**Plan**: `./plan.md`
**Status**: `Draft`
**Last updated**: 2026-11-23

---

## How to use

- Tasks are sequential by default; `(parallel)` tasks can run alongside their predecessor.
- Each task names its files so an implementer can pick it up cold.
- Tick the checkbox as the PR lands; add new tasks at the bottom, never renumber.
- Everything stays behind the runtime flag and the tenant's feature code `FEATURE_TEAMS_PEOPLE_SELF_SERVICE`: the feature is off by default; after the trial period the code may be switched on by default for new tenants only (its default in the platform's feature catalogue); existing tenants keep their stored toggle until an administrator changes it.
- Paths that start with `core/`, `app/` or `public/` are under `apps/web/` of the Ever Teams repository; mobile paths
  start with `apps/mobile/` (or `app/` where a task names the mobile app).

## Phase 1 — Types, services, hooks

- [ ] **T1**. Runtime flag `NEXT_PUBLIC_PEOPLE_SELF_SERVICE_ENABLED` and the Gauzy web app address
      `NEXT_PUBLIC_GAUZY_WEB_APP_URL` in `apps/web/.env.sample`, helper `core/lib/utils/self-service-enabled.ts` in the
      pattern of the existing `*-enabled.ts` helpers (`core/lib/utils/inbox-enabled.ts`), combining the flag with the
      tenant's toggle of `FEATURE_TEAMS_PEOPLE_SELF_SERVICE` read once per session from `GET /user/me`, mobile runtime
      config key. `getAuthenticatedUserData` of `core/services/client/api/users/user.service.ts` requests the relations
      `['role', 'tenant']` today and gains `tenant.featureOrganizations` and `tenant.featureOrganizations.feature`; the
      `ITenant` interface of `core/types/interfaces/tenant/tenant.ts` gains `featureOrganizations` (a new
      `IFeatureOrganization` with `isEnabled` and `feature.code`); in proxy mode the same read goes through
      `app/api/user/me/route.ts`, whose guard calls `currentAuthenticatedUserRequest` of
      `core/services/server/requests/auth.ts` with its default relations, so that default gains the two relations as
      well; a code without a toggle row reads as off. This one
      session read also serves `workspace-collaboration-clients`. Files: `apps/web/.env.sample`,
      `core/lib/utils/self-service-enabled.ts`, `core/services/client/api/users/user.service.ts`,
      `core/services/server/requests/auth.ts`,
      `core/types/interfaces/tenant/tenant.ts`. Test: helper spec (off by default; off for a tenant whose code is off
      while the flag is on; on only when both are on); `core/services/client/api/users/user.service.test.ts` (the
      `/user/me` request carries both relations; signed in as an ordinary employee without administration permissions,
      the session holds the tenant's toggle of the code, on and off, in direct mode and through the proxy route); links hidden without the address.
- [ ] **T2**. Interfaces `core/types/interfaces/{time-off,attendance,shifts,offline}/*` and Zod schemas
      `core/types/schemas/{time-off,attendance,shifts,offline}/*`, promoted to `packages/types/src/time-attendance/`.
      Test: schema specs against platform response samples.
- [ ] **T3**. One area-availability helper `core/hooks/common/use-area-availability.ts` generalized from
      `core/hooks/docs/use-docs-availability.ts`, `core/hooks/inbox/use-inbox-availability.ts` and
      `core/hooks/ai/use-server-ai-availability.ts` (which keep their names and call it); areas `attendance`, `shifts`,
      `timeOff` registered. Test: `404` hides an area once per session; the docs and inbox probes behave as before.
- [ ] **T4**. Offline queue engine `packages/utils/src/offline-queue/` (ordering, client ids, backoff, conflict
      classifier, kinds registered by features) with storage adapters `apps/web/core/lib/offline/indexed-db-queue-store.ts`
      and the mobile store on the existing `react-native-mmkv`, encrypted with a key in the secure store
      (`apps/mobile/app/services/offline/encrypted-queue-store.ts`). Test: order, single application across retries
      (every retry under the same client id; a replayed first answer marks the item sent), restart survival,
      classifier table.
- [ ] **T5**. `useQueuedMutation`, `useOfflineQueue`, `useSyncConflicts`, `useQueueReplay` in
      `core/hooks/offline/`; atoms in `core/stores/offline/queue.ts`. Test: offline mutation queued and replayed; `409`
      becomes a conflict; `IDEMPOTENCY_IN_PROGRESS` waits and retries under the same key; `IDEMPOTENCY_KEY_REUSED`
      becomes `INVALID`; a retry after editing gets a new client id.
- [ ] **T6** (parallel). Attendance and shifts services `core/services/client/api/{attendance,shifts}/*.service.ts`,
      proxy routes `app/api/attendance/**`, `app/api/shifts/**` with `forwardToGauzy` (`core/services/server/forward-to-gauzy.ts`), hooks `useCheckInState`,
      `useCheckIn`, `useLocationOnce`, `useMyCheckIns`, `useAttendanceLayer`, `useAttendanceExceptions`,
      `useAttendanceRequest`, `useTeamPresence`, `useMyShifts`, `useOpenShifts`, `useShiftTrades`, `useShiftRequest`
      (`core/hooks/attendance/`, `core/hooks/shifts/`);
      keys in `core/query/keys/index.ts`. Test: hook specs; check-in offline goes through the batch; the coordinates of
      a queued check-in exist only in its queue entry and are gone once the platform has answered it or it is
      discarded; a running timer reads as present where the organization counts the timer as check-in.
- [ ] **T7** (parallel). Time-off service and routes `app/api/time-off/**` (`core/services/client/api/time-off/time-off.service.ts`), first over the existing core
      `/time-off-request`, `/time-off-policy`, `/time-off-balance`, `/official-holiday`, then over the `time-off-management`
      routes when the probe finds them; hooks `useTimeOffBalances`, `useTimeOffPreview`, `useTimeOffRequests`,
      `useTimeOffRequest`, `useHolidays`, `useCompensatoryClaim`, `useCalendarFeed` (`core/hooks/time-off/`). Test: preview and submit on both
      route sets.
- [ ] **T8** (parallel). Attachment helpers for time-off and correction requests: image resize and location-metadata
      strip in `packages/utils/src/images/`, multipart streamed by the proxies. Test: upload progress; location metadata
      removed.
- [ ] **T9**. Link to the Gauzy web app for payslips; test: link shown when the web app address is configured. Files:
      `core/lib/utils/gauzy-web-app-url.ts`, `core/components/features/gauzy-links/gauzy-web-app-link.tsx` (the one link
      component, with the device-lock note before payslips and HR records).
- [ ] **T10** (parallel). Inbox decisions: `useInboxDecisionsView` over the existing inbox items (kind `APPROVAL`) with
      the facts per kind added to `decisionOf` in `core/lib/utils/inbox-entry.ts`, single decisions through the existing
      reply of `core/components/pages/inbox/inbox-decision.tsx` with a 5-second undo (`pendingUndoAtom`), `useBulkDecide` over
      `POST /workflows/tasks/decide-bulk`. Test: own requests filtered; undo cancels the send; timesheet rows open the
      Timesheets page.
- [ ] **T11**. Session states on the existing authenticator and session state: no-employee state for this feature's
      cards and pages, forced password change in the existing sign-in, sign-out with unsent items (send when online,
      discard, or stay signed in). Files: `apps/web/core/components/layouts/app/authenticator.tsx`. Test: each state;
      after sign-out no cached record or queued item of the account remains.

## Phase 2 — Screens on existing pages

- [ ] **T12**. Pages `app/[locale]/(main)/{time-off,attendance,shifts}/` inside the existing `(main)` group, flag
      redirect; entries in the "My works" group of `core/components/layouts/app-sidebar.tsx`; palette entries in
      `core/lib/utils/palette-items.ts` (check in, request time off). Test: redirect when off; entries hidden when off.
- [ ] **T13**. Home and My week cards: `useHomeTimeCards` and card components in
      `core/components/features/time-off/home/*` added to `app/[locale]/page-component.tsx` and
      `core/components/dashboards/my-week/*` (`my-week-page.tsx`), each with its own loading and error state; shortcuts card reorderable per
      device. Test: one failing card leaves the others and the timer section.
- [ ] **T14**. Check-in components `core/components/features/check-in/*` (`check-in-button.tsx`, `location-state.tsx`,
      `recent-check-ins.tsx`, `kiosk-code.tsx`): button beside the header timer and on Home with
      direction, location states, refusal messages, recent check-ins, kiosk code. Test: inside, outside, denied, remote
      day.
- [ ] **T15**. Time-off pages `time-off/*` (`app/[locale]/(main)/time-off/page.tsx`, `new/page.tsx`, `[id]/page.tsx`,
      components in `core/components/features/time-off/`): balances with ledger drawer, request form with preview panel, my requests,
      holidays, feed address, compensatory claim; team off status on `TeamLiveSummary`
      (`core/components/pages/teams/team/team-live-summary.tsx`) and
      `core/components/dashboards/team/team-today-card.tsx`. Test: rendering and form specs.
- [ ] **T16**. Inbox Decisions view in `core/components/pages/inbox/inbox-page.tsx`: decision rows with facts, comment
      dialog, transitions, links to the Gauzy web app for other kinds. Test: comment required where the platform
      requires it.
- [ ] **T17**. Link to the Gauzy web app for payslip pages in the work section of Settings → Profile (T18), with no
      sidebar entry; test: link shown in the profile section when the web app address is configured; the sidebar has no
      payslip entry. Files: `core/components/features/gauzy-links/payslips-link.tsx`,
      `core/components/settings/pages/profile/profile-settings-page.tsx`.
- [ ] **T18**. Work section of `core/components/settings/pages/profile/profile-settings-page.tsx` (organization, position,
      department, read-only) with the Gauzy web app link for HR records; install choice in Preferences
      (`core/components/settings/pages/preferences/preferences-settings-page.tsx`); the existing
      profile rows and `rates-section.tsx` untouched. Test: fields read-only; link hidden without the address; the
      existing profile rows and rates section render as before with the flag on.
- [ ] **T19**. Offline: `core/components/common/offline-wrapper.tsx` gains the offline-capable route list rendered from
      the persisted query cache under an offline banner (other routes keep the existing Offline page); header badge for
      unsent items and the conflict review drawer `core/components/features/offline/*` (`unsent-items-badge.tsx`,
      `conflict-review-drawer.tsx`) with retry, related action and
      discard. Test: Home readable offline; an unlisted route still shows the Offline page; each conflict kind shows its
      action.
- [ ] **T20**. Installable app: `app/manifest.ts` (start URL `/`), `public/app-sw.js` (shell cache, update prompt and
      badge, imports `inbox-push-sw.js`), `core/components/features/offline/register-app-worker.tsx`, install prompt with
      30-day snooze (the script choice for both registration paths and the way back to the inbox worker: T37). Test:
      worker registered while this feature or `workspace-collaboration-clients` is on for the tenant (each alone and
      both), not registered with both off; update prompt; inbox push still delivered.
- [ ] **T21**. i18n `timeOff.*`, `attendance.*`, `shifts.*`, `offline.*` in every file of `apps/web/locales/`; cspell
      words. Test: locale completeness gate.
- [ ] **T37**. One worker for both registration paths and the way back: `core/lib/utils/app-worker.ts` answers whether
      the app worker is on (this feature or `workspace-collaboration-clients` on for the tenant) and which script to
      register (`/app-sw.js` while on, `/inbox-push-sw.js` otherwise); `enable` of the existing
      `core/hooks/inbox/use-inbox-web-push.ts` registers that script instead of the fixed `/inbox-push-sw.js`, so
      switching push on keeps the app worker and works as today with the feature off;
      `core/components/features/offline/register-app-worker.tsx`, mounted in `app/[locale]/(main)/layout.tsx` whatever
      the flags, puts `inbox-push-sw.js` back on the registration at `/` once both features are off (the push
      subscription stays with the registration), removes a registration without a push subscription, deletes the app
      worker's caches only on a later page load that finds the registration no longer running `app-sw.js` (or gone), and
      does nothing on a browser that never ran the app worker; the registration of `app-sw.js` and the cleanup
      both run inside one cross-tab lock (`navigator.locks.request('app-worker')`), and inside it the cleanup asks the
      worker for its window clients and goes ahead only when this tab is the only one (otherwise it is left to a later
      page load), so no tab has to answer and no tab loses the worker it uses. Files: `core/lib/utils/app-worker.ts`,
      `core/hooks/inbox/use-inbox-web-push.ts`, `core/components/features/offline/register-app-worker.tsx`,
      `app/[locale]/(main)/layout.tsx`. Test: `core/lib/utils/app-worker.test.ts` (script for each of the four flag
      combinations: `/app-sw.js` while either feature is on, `/inbox-push-sw.js` with both off);
      `core/hooks/inbox/use-inbox-web-push.test.tsx` (switching push on while the app worker runs keeps `app-sw.js` and
      its shell cache; with both features off it registers `inbox-push-sw.js` as today);
      `core/components/features/offline/register-app-worker.test.tsx` (this feature switched off while
      `workspace-collaboration-clients` stays on keeps `app-sw.js` and its caches; once both are off the registration
      runs `inbox-push-sw.js` with the same push subscription and a test push is shown; without a subscription the
      registration and the caches are gone; with a second tab open, whatever it shows and even when it cannot
      reach the platform, the registration and the caches stay, and the last remaining tab cleans up on its next load; a
      tab that opens with a feature on while a cleanup holds the lock registers `app-sw.js` after it and keeps it; a tab
      that loads during a cleanup still finds the app worker's caches, which go only on a later load without `app-sw.js`).

## Phase 3 — Live updates, notifications, polish

- [ ] **T22**. Real-time subscriptions in `core/hooks/time-off/use-time-attendance-live.ts` over
      `core/hooks/realtime/use-realtime-event.ts`, invalidating the three key groups on request, day and shift events;
      60-second fallback while visible. Test: event invalidates the right keys.
- [ ] **T23**. Push and badge: the new kinds on the existing `core/hooks/inbox/use-inbox-web-push.ts`,
      `core/services/client/api/inbox/inbox-push.service.ts` and
      `core/components/settings/pages/notifications/notification-push-section.tsx`, blocked-permission help, `useAppBadge` from the inbox unread count, deep links
      from notifications on cold start. Test: subscribe and remove; deep link routing table.
- [ ] **T24**. Approver digest time on the existing notification settings page (preference of the inbox delivery
      digests) and swipe rows with button equivalents and bulk decisions with skipped reasons on the Inbox Decisions
      view. Files: `core/components/settings/pages/notifications/notifications-settings-page.tsx`,
      `core/components/settings/pages/notifications/approver-digest-row.tsx`,
      `core/components/pages/inbox/inbox-decision-swipe-row.tsx`, `core/components/pages/inbox/inbox-bulk-decide-bar.tsx`.
      Test: keyboard alternative; bulk result list.
- [ ] **T25**. Home prompts (missing check-out, holiday worked, shift without check-in) as one-tap actions. Files:
      `apps/web/app/[locale]/page-component.tsx`, `core/components/features/time-off/home/home-prompts.tsx`. Test: each
      prompt opens the prefilled action.
- [ ] **T26**. Custom-field rendering in the request forms when the platform declares fields (required and read-only
      respected). Files: `core/components/features/forms/declared-custom-fields.tsx`, the request forms of
      `core/components/features/time-off/` and `core/components/features/attendance/`. Test: declared field rendered and validated.

## Phase 4 — Other clients and docs

- [ ] **T27**. Mobile: check-in on the existing timer screen (`apps/mobile/app/screens/authenticated/timer-screen/`), a time off section in
      `apps/mobile/app/navigators/authenticated-navigator.tsx` with screens `app/screens/authenticated/time/{time-off,
      decisions}`, work section on the existing profile screen (`apps/mobile/app/screens/authenticated/profile-screen/`),
      device location at the tap, encrypted queue store,
      push registration when the platform offers it, language tables (`apps/mobile/app/i18n/`). Test: screen tests; queue survives app restart.
- [ ] **T28**. Desktop: confirm the web screens in `apps/server-web`; check-in button and Inbox decisions badge in the
      existing popup `apps/extensions/components/popup/` (`Timer.tsx`, `Header.tsx`). Test: extension popup rendering.
- [ ] **T29**. User docs (installing Ever Teams, checking in, time off, offline, approvals in the Inbox) and the
      `docs/specs/README.md` row; spec status `Implemented` when Phase 5 lands. Test: docs build.

## Phase 5 — Depth areas

- [ ] **T30**. Attendance: Calendar layers in `core/components/calendar/` (`calendar-month-view.tsx`,
      `calendar-time-grid.tsx`, `calendar-day-panel.tsx`, new `calendar-layers.tsx`: attendance days with text status, shifts,
      time off, holidays; layer switches; sources in the existing day panel); `attendance/*` pages
      (`app/[locale]/(main)/attendance/`, `core/components/features/attendance/`) for exceptions with
      resolutions, remote, off-site, correction and overtime requests. Test: layer labels; preview warnings; time entries
      unchanged with every layer on.
- [ ] **T31**. Shifts pages `shifts/*` (`app/[locale]/(main)/shifts/`, `core/components/features/shifts/`): my shifts with changes, shift request, open shifts, trades, feed address. Test:
      pick-up result states.
- [ ] **T32**. Link to the Gauzy web app for expense claims and receipts; test: link shown when the web app address is
      configured. Files: `core/components/features/gauzy-links/expense-claims-link.tsx`.
- [ ] **T33**. Link to the Gauzy web app for advances, travel and company cards; test: link shown when the web app
      address is configured. Files: `core/components/features/gauzy-links/advances-travel-cards-links.tsx`.
- [ ] **T34**. Link to the Gauzy web app for earned pay; test: link shown when the web app address is configured. Files:
      `core/components/features/gauzy-links/earned-pay-link.tsx`.
- [ ] **T35**. Mobile Phase 3: shifts, attendance requests and the month of attendance days in the time section of the
      existing navigator, attachments from the camera through the existing `expo-image-picker`. Files:
      `apps/mobile/app/screens/authenticated/time/shifts/index.tsx`, `apps/mobile/app/screens/authenticated/time/attendance/index.tsx`,
      `apps/mobile/app/navigators/authenticated-navigator.tsx`. Test: screen tests;
      requests queued offline with their attachments.
- [ ] **T36**. PDFs of decided time-off and attendance requests where the platform prints them. Files:
      `core/components/features/time-off/request-pdf-link.tsx`, `core/components/features/attendance/request-pdf-link.tsx`. Test: download link
      shown only when the platform answers.
- [ ] **T38**. In and late status on the existing team member cards: `useTeamPresence` (T6) over
      `/attendance/presence?teamId=` rendered as a status badge (text, not only color) beside the time-off status of
      T15 on `TeamLiveSummary` (`core/components/pages/teams/team/team-live-summary.tsx`) and
      `core/components/dashboards/team/team-today-card.tsx`, shown only where the attendance area is available. Files:
      `core/components/features/attendance/team-presence-badge.tsx`,
      `core/components/pages/teams/team/team-live-summary.tsx`, `core/components/dashboards/team/team-today-card.tsx`.
      Test: `core/components/features/attendance/team-presence-badge.test.tsx` (in, late and off each show their text;
      nothing shown without the attendance area; both cards render as before with the flag off).

## Requirement Coverage

Every functional requirement of `spec.md` §3 and the tasks that implement it; each task's test clause verifies it, together with the acceptance criteria of `spec.md` §7 that cite it.

| Requirements | Spec section | Tasks |
| --- | --- | --- |
| FR-1 | §3.1 Enabling, installing, signing in | T1, T12, T20, T37 |
| FR-2 | §3.1 Enabling, installing, signing in | T3 |
| FR-3 | §3.1 Enabling, installing, signing in | T18, T20, T37 |
| FR-4 | §3.1 Enabling, installing, signing in | T27, T35 |
| FR-5–FR-8 | §3.1 Enabling, installing, signing in | T11 |
| FR-9 | §3.1 Enabling, installing, signing in | T9, T17, T18 |
| FR-10–FR-11 | §3.2 Home and My week | T13 |
| FR-12 | §3.2 Home and My week | T25 |
| FR-13–FR-17 | §3.3 Check-in and check-out | T14 |
| FR-18 | §3.3 Check-in and check-out | T6, T14 |
| FR-19 | §3.4 Offline queue and conflict review | T4, T5, T27 |
| FR-20 | §3.4 Offline queue and conflict review | T4, T5, T19 |
| FR-21 | §3.4 Offline queue and conflict review | T5, T19 |
| FR-22 | §3.4 Offline queue and conflict review | T19 |
| FR-23 | §3.4 Offline queue and conflict review | T4, T27 |
| FR-24 | §3.5 Time off | T7, T15 |
| FR-25 | §3.5 Time off | T7, T8, T15 |
| FR-26 | §3.5 Time off | T15 |
| FR-27 | §3.5 Time off | T7, T15, T30 |
| FR-28 | §3.5 Time off | T7, T15, T25 |
| FR-29 | §3.6 Attendance and shifts | T30 |
| FR-30 | §3.6 Attendance and shifts | T6, T30 |
| FR-31 | §3.6 Attendance and shifts | T30 |
| FR-32–FR-33 | §3.6 Attendance and shifts | T31 |
| FR-34 | §3.7 Expenses and advances | T32 |
| FR-35–FR-37 | §3.7 Expenses and advances | T32 |
| FR-38–FR-40 | §3.7 Expenses and advances | T33 |
| FR-41–FR-44 | §3.8 Payslips | T9, T17 |
| FR-45 | §3.8 Payslips | T34 |
| FR-46 | §3.9 Approvals in the Inbox | T10, T16 |
| FR-47 | §3.9 Approvals in the Inbox | T16 |
| FR-48 | §3.9 Approvals in the Inbox | T10, T16, T24 |
| FR-49 | §3.9 Approvals in the Inbox | T24 |
| FR-50 | §3.9 Approvals in the Inbox | T10, T15, T38 |
| FR-51 | §3.9 Approvals in the Inbox | T10, T16 |
| FR-52–FR-53 | §3.10 Profile | T18 |
| FR-54–FR-55 | §3.11 Notifications and live updates | T23 |
| FR-56 | §3.11 Notifications and live updates | T22, T30 |
| FR-57 | §3.11 Notifications and live updates | T23 |
| FR-58 | §3.12 Forms, attachments, documents, language, other clients | T26 |
| FR-59 | §3.12 Forms, attachments, documents, language, other clients | T8 |
| FR-60 | §3.12 Forms, attachments, documents, language, other clients | T36 |
| FR-61 | §3.12 Forms, attachments, documents, language, other clients | T21, T27 |
| FR-62 | §3.12 Forms, attachments, documents, language, other clients | T28 |

## Definition of Done

- All checkboxes ticked; `web.before-merge` gate green.
- Flag default stays off; enabling it in dev shows the feature end to end.
- Constitution gates in `spec.md` §9 confirmed.
- With the flag off, the existing Home, My week, Calendar, Inbox, Settings, timer, offline page, push worker and mobile
  screens behave exactly as before.
- No new page, menu entry or service duplicates an existing Ever Teams screen (Home, Inbox, Calendar, Settings).
- No queued action is lost or applied twice in the replay test suite (restart, crash, reconnect, lost answer, conflict).
- No personal record remains on the device after sign-out on web and mobile.

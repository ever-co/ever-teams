# Feature Specification: Time, attendance and leave in Ever Teams

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `people-self-service`
**Branch**: `feat/people-self-service`
**Status**: `Draft`
**Created**: 2026-11-16
**Last updated**: 2026-11-23
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_PEOPLE_SELF_SERVICE_ENABLED` (default off; the mobile app reads the same key from its runtime config) offers the feature on a deployment; for each tenant it is on only where the tenant's feature code `FEATURE_TEAMS_PEOPLE_SELF_SERVICE` of the platform's feature catalogue (off by default) is on as well
**Platform API dependency**: platform specs `attendance-and-shifts`, `time-off-management`, `approval-workflows` (approval items of the Inbox), `calendar-and-scheduling` (personal calendar feed); the existing time-off, time-off policy, time-off balance and official holiday routes, the existing inbox (items, decisions, push devices, delivery digests) and the existing session routes

---

## 1. Overview

Ever Teams is where people track time and work on projects and tasks: timer, tasks, teams, daily plans, timesheets,
reports, inbox, chat and docs on the web, and timer, tasks, team and profile on the phone. This feature adds, for the
employees who already sign in to Ever Teams, the time-related half of their working day: **check-in and check-out**
with location proof, **attendance** with requests and corrections, **time off** with balances and requests, and
**shifts** with requests, open shifts and trades. Nothing here is an app of its own: the new cards sit on the existing
**Home** and **My week**, the new pages under the existing **My works** group of the sidebar, attendance, shifts, time
off and holidays as layers of the existing **Calendar** page, a manager's approvals as a **Decisions** view of the
existing **Inbox**, work details on the existing **Settings → Profile**, push through the existing inbox push, and the
existing sign-in, navigation and state management throughout. Every record lives in the platform; Ever Teams owns the
screens, client state, offline behaviour and live updates. Web ships first; the mobile app follows in its existing
navigation (plan §8); the desktop app shows the web screens; the browser extension gets check-in.

Expense claims, advances, travel requests, payslips and HR records are not part of Ever Teams: employees use them in the
Gauzy web app (installable on phones).

**Advanced capabilities.** Home puts shift, check-in, time off and open attendance exceptions beside the timer and
today's plan, and turns platform signals into one-tap fixes (a missing check-out, a holiday worked). Check-in works
offline: every action is queued with its original time and replayed in order, and anything the platform refuses on
sync lands in a conflict review with the reason, never dropped. Managers decide in the Inbox with swipe actions and
undo, in bulk where allowed, and get one morning digest of what still waits.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** an employee on their phone at 8:55 with a 9:00 shift at the Berlin office, **when** they open Ever Teams,
  **then** Home shows, beside the timer and today's plan, the shift, "Check in" and Friday's approved day off; one tap
  checks them in, inside the office radius, and the card shows "In since 8:55".
- **Given** the same employee in a lift with no signal, **when** they tap "Check out", **then** the app shows "Out at
  18:02 (waiting to send)", keeps it through an app restart, and sends it with its original time when the network
  returns.
- **Given** a check-out queued for a day that was locked before it synced, **when** the queue sends it, **then** it
  appears under "Needs your attention" with "Day locked on 3 March" and an action to request a correction.
- **Given** an employee with 12.5 days of annual leave, **when** they pick 14 to 18 April with the 18th as a half day,
  **then** before submitting they see 4.5 days, 8 left after, the approver's name, and that a task of theirs is due
  on the 16th; they submit and the request shows "Pending".
- **Given** a manager with seven waiting approvals, **when** they open the Inbox Decisions view, **then** each row shows
  the facts (dates, balance after, policy findings); a swipe right approves with a 5-second undo, a swipe left asks for
  a comment and denies; at 8:00 the next day one digest lists what is still waiting and what is due today.
- **Given** an open shift on Saturday that the employee is eligible for, **when** they tap "Pick up", **then** the
  platform's checks run and the shift appears in My shifts as approved or waiting for the manager.
- **Given** a holiday on which the employee tracked 3 hours, **when** they open Home, **then** a prompt offers a
  compensatory time-off claim prefilled with those hours.
- **Given** a team lead on the Calendar page, **when** they switch on the time-off and shifts layers, **then** the month
  view shows who is off and who works which shift next to their own time entries.

### 2.2 Edge cases & failures

- **Given** the flag is off, **when** a path of this feature is visited, **then** the user is sent home and no new card,
  page, menu entry, layer, worker or prompt appears (the app worker stays while `workspace-collaboration-clients` is
  on); timer, tasks, inbox, calendar and settings are unchanged.
- **Given** a platform without a feature (for example shifts), **when** the app starts, **then** that area is hidden
  for the session and nothing errors.
- **Given** a signed-in user without an employee record, **then** the new cards are hidden and the time-off,
  attendance and shift pages explain that they need one, offering the existing organization switch.
- **Given** location permission denied while the organization requires location proof, **when** the employee taps
  "Check in", **then** the app explains how to allow location and offers the kiosk code instead.
- **Given** a check-in outside the radius, **then** the platform's answer is shown (refused, or recorded and flagged)
  with the distance; the app never retries in the background.
- **Given** an approval decided offline after the request was withdrawn, **when** it syncs, **then** the conflict
  review shows "withdrawn by the requester" and nothing is decided.
- **Given** a manager who is also the requester, **then** their own request never shows in their Decisions view.
- **Given** sign-out with three unsent items, **then** the app lists them and asks to send them (when online), discard
  them, or stay signed in until they are sent; once signed out, nothing of the account stays on the device.
- **Given** notifications blocked by the browser or the phone, **then** the existing notification settings say so with
  steps to allow them, and the Inbox keeps working.
- **Given** the platform answers `409` (decided elsewhere or changed), **then** the screen refreshes the record and says
  what changed.

## 3. Functional Requirements

### 3.1 Enabling, installing, signing in

- **FR-1** The app MUST, with the flag or the tenant's feature code off, show and register nothing of this feature and keep the timer, tasks,
  teams, inbox, calendar, settings and the mobile screens as they are.
- **FR-2** The app MUST show each area (check-in and attendance, shifts, time off) only when the platform answers its
  routes and the person holds its permission, probing once per session through the app's one area-availability check.
- **FR-3** The Ever Teams web app MUST be installable as a whole: one app manifest (name, icons, standalone display,
  opening on the existing Home), an install prompt the person can dismiss (asked again after 30 days at most), and one
  app service worker that caches the app shell, keeps the existing inbox push handling and offers "Reload to update"
  when a new version is ready; switching push on keeps that worker, and once the feature is off again each browser gets
  the existing inbox push worker back with its push subscription.
- **FR-4** The mobile app MUST offer the same features inside its existing navigation (check-in on the timer screen, a
  time off and shifts section beside timer, team and profile), with the same rules.
- **FR-5** These features MUST use the existing Ever Teams sign-in and session (password, one-time code, social
  sign-in where configured, two-factor, forgot and change password); they add no sign-in screen.
- **FR-6** The existing sign-in MUST require a password change before anything else when the platform says the password
  must be changed.
- **FR-7** With the flag on, a signed-in user without an employee record in the current organization MUST see the new
  cards hidden and, on the time-off, attendance and shift pages, an explanation with the existing organization switch.
- **FR-8** The app MUST keep the employee and organization summary in its existing session state, refresh it on resume
  and on platform events, and on sign-out, once the unsent items are sent or discarded (§2.2, FR-19), clear every
  cached record and queued item of this feature.
- **FR-9** Ever Teams shows a link to the Gauzy web app for device lock before payslips and HR records.

### 3.2 Home and My week

- **FR-10** With the flag on, the existing Home MUST gain cards beside its timer section, team summary and daily plans:
  today's shift or expected hours, check-in state with its one-tap action, time off today and in the next 14 days,
  holidays this week, my pending requests and open attendance exceptions; My week MUST show the week's shifts, time off,
  holidays and attendance days beside its days and summary; each card loads, refreshes and fails on its own.
  *(advanced)*
- **FR-11** Home MUST offer shortcuts to the person's frequent actions (by default: request time off, request a
  correction, my shifts), which the person can reorder and change on each device.
- **FR-12** The app MUST turn platform signals into one-tap prompts on Home: a missing check-out (resolve the
  exception), tracked time on a rest day or holiday (draft compensatory claim), a shift starting with no check-in.
  *(advanced)*

### 3.3 Check-in and check-out

- **FR-13** The app MUST check in or out in one tap from a button next to the existing timer (header and Home), the
  direction following the last state shown with its time, and offer break start and end where the person's shift
  allows them.
- **FR-14** The app MUST ask for location only at the moment of the tap and only when the organization requires
  location proof, show locating, denied and unavailable states, show inside or outside with the distance, never show a
  third-party map, and ask nothing on an approved remote day.
- **FR-15** The app MUST show the platform's reason for a refused check-in (outside the location, channel disabled,
  day locked, not active) with the next step.
- **FR-16** The app MUST list the person's recent check-ins with time, direction, channel and day.
- **FR-17** The app MUST show the rotating kiosk code for check-in at an office terminal.
- **FR-18** The app MUST show the running timer as present where the organization counts the timer as check-in, without
  asking for a second tap.

### 3.4 Offline queue and conflict review

- **FR-19** The app MUST queue while offline, with device time, sequence and a client id: check-ins (with the
  coordinates read at the tap where location proof is required), time-off,
  attendance, overtime and shift requests, withdrawals, exception resolutions and Inbox decisions; the queue survives
  restarts and shows a count and each item's state. *(advanced)*
- **FR-20** The app MUST send queued items in order on reconnect, each with its idempotency key (the queued action's
  client id, the same on every retry), check-ins through the platform's offline batch so their original time is kept,
  and never have an item applied twice: a retry after a lost answer may reach the platform again, which then returns
  its first answer instead of acting a second time.
- **FR-21** The app MUST put every item the platform refuses on sync (changed or decided elsewhere, locked day,
  overlap, too old, permission lost) in a conflict review with the reason and the current state, offering retry after
  editing, a related action (for example request a correction) or discard. *(advanced)*
- **FR-22** With the flag on, going offline MUST no longer hide the whole app behind the offline page: Home, My week,
  recent check-ins, the Calendar layers of the current and previous month, balances and requests and shifts of the next
  14 days stay readable from cache with their age under an offline banner, and the queue takes their writes; other pages
  keep today's offline page.
- **FR-23** The mobile app MUST store cached records and the queue encrypted and bound to the account.

### 3.5 Time off

- **FR-24** The app MUST show balances per policy (available, pending, projected for a chosen date) and on tap the
  ledger with each entry's derivation.
- **FR-25** The app MUST let the person request time off (policy, dates, whole day, halves or hours, reason,
  attachments from the camera or files, email switch) with a live preview of duration, balance after, approver,
  warnings and collisions before submitting, show refusal reasons, edit while undecided and withdraw.
- **FR-26** The app MUST list my requests with status filters and history, updated live.
- **FR-27** The app MUST show the holidays of my calendar, who in my team is off (on the existing team member cards and
  as a Calendar layer), and the address of my personal calendar feed.
- **FR-28** The app MUST let the person claim compensatory time off, prefilled from tracked time on rest days or
  holidays.

### 3.6 Attendance and shifts

- **FR-29** The existing Calendar page MUST offer attendance days (status in colour and text), shifts, time off and
  holidays as layers of its month view and time grid, and on a day show their sources and history in its day panel.
- **FR-30** The app MUST list my open attendance exceptions with their one-step resolutions.
- **FR-31** The app MUST let the person request remote or off-site work, a correction of a past day with an attachment,
  and overtime before it is worked, with the platform's preview and warnings.
- **FR-32** The app MUST show my published shifts with changes marked, let me request another shift, list open shifts
  I may take and pick them up or volunteer, and offer, accept or decline trades.
- **FR-33** The app MUST show the address of my shift calendar feed.

### 3.7 Expenses and advances

- **FR-34** Ever Teams shows a link to the Gauzy web app for expense claims.
- **FR-35** Ever Teams shows a link to the Gauzy web app for receipt capture.
- **FR-36** Ever Teams shows a link to the Gauzy web app for expense policy findings and duplicate warnings.
- **FR-37** Ever Teams shows a link to the Gauzy web app for claim lists and reimbursement state.
- **FR-38** Ever Teams shows a link to the Gauzy web app for advances.
- **FR-39** Ever Teams shows a link to the Gauzy web app for travel requests.
- **FR-40** Ever Teams shows a link to the Gauzy web app for company-card transactions to explain.

### 3.8 Payslips

- **FR-41** Ever Teams shows a link to the Gauzy web app for payslips.
- **FR-42** Ever Teams shows a link to the Gauzy web app for offline payslip copies.
- **FR-43** Ever Teams shows a link to the Gauzy web app for payslip explanations.
- **FR-44** Ever Teams shows a link to the Gauzy web app for payslip notifications.
- **FR-45** Ever Teams shows a link to the Gauzy web app for earned pay.

### 3.9 Approvals in the Inbox

- **FR-46** The existing Inbox MUST offer a Decisions view of the approval tasks waiting for the person (time off,
  attendance requests and corrections, overtime, shift requests and trades), each row with its facts, from the
  platform's approval items; timesheet approvals open the existing Timesheets page; decisions of other kinds keep the
  existing decision row and open their record in the Gauzy web app.
- **FR-47** An approver can approve, deny with a comment, or take a transition the platform offers, from the Inbox row
  or the record; comments are required where the platform requires them.
- **FR-48** Inbox decision rows MUST offer swipe right to approve and swipe left to deny (comment asked when required),
  each with 5 seconds to undo before it is sent, and bulk approval of tasks of one kind, listing those skipped and why.
  *(advanced)*
- **FR-49** The existing notification settings MUST offer a daily digest at a time the approver picks (default 8:00):
  one notification listing what waits, the oldest and what is due today, opening the Inbox Decisions view.
  *(advanced)*
- **FR-50** My reports' requests and their states MUST reach me through the Inbox, and who in my team is in, off or late
  today MUST show as extra status on the existing team member cards (Home team summary and team dashboard).
- **FR-51** The app MUST never offer a person a decision on their own request.

### 3.10 Profile

- **FR-52** The existing Settings → Profile MUST show the person's organization, position and department read-only from
  their employee record; in that section Ever Teams shows a link to the Gauzy web app for editing HR records
  (self-editable fields, emergency contacts, documents).
- **FR-53** Settings MUST keep its existing entries (password, language, notifications, sessions, sign out) as the
  profile's links and add the install choice of FR-3 to Preferences; the existing profile rows (photo, names, email,
  password, phone) and the existing rates section (pay and bill rates, rate change requests) stay as they are, and this
  feature adds nothing about pay.

### 3.11 Notifications and live updates

- **FR-54** The app MUST let the person turn push on or off per device through the existing inbox push (web) and the
  mobile device registration, explain blocked permissions, and keep per-kind choices on the existing notification
  settings page.
- **FR-55** The app MUST show this feature's notifications in the existing inbox and bell with an unread filter, mark all
  read, and open the record on its page; the installed app and the mobile icon carry the unread count.
- **FR-56** The app MUST refresh lists, cards and Calendar layers through the shared real-time client when requests are
  decided, days change and shifts are published; without it, every 60 seconds while visible.
- **FR-57** The app MUST open the right screen from a notification even when it was closed.

### 3.12 Forms, attachments, documents, language, other clients

- **FR-58** Forms MUST show the custom fields the platform declares for these record types (required and read-only
  respected) when the platform offers them, and the base fields otherwise.
- **FR-59** Attachments MUST come from the camera, gallery or files, be resized before upload within the platform's
  limits, show progress and be removable before submission.
- **FR-60** The app MUST download or share the PDF the platform prints for decided time-off and attendance requests.
- **FR-61** Every string MUST be in every web locale and every mobile language table; dates, numbers and currencies
  follow the person's locale, including right-to-left layouts.
- **FR-62** The desktop app MUST show the same web screens; the browser extension MUST offer check-in and check-out and
  the count of Inbox decisions waiting.

## 4. Non-Functional Requirements

- **Performance**: Home cards visible under 1 s from cache and under 2 s cold on a mid-range phone over 4G; a check-in
  confirmed under 1 s online and instantly as queued offline; lists of 500 requests scroll without dropped frames.
- **Reliability**: no queued item lost across restarts, crashes or updates; each applied once (idempotency key reused
  on every retry); live
  updates resume after a reconnect without a reload; a failed card never blanks the page.
- **Security & privacy**: tokens exchanged server-side on the web as today; the mobile token in the device's secure
  store; cached records encrypted on mobile and cleared on sign-out; location read only at the tap and sent as
  coordinates for the platform's check: an online check-in keeps none on the device, and a check-in queued offline
  keeps the tap's coordinates only in its queue entry (encrypted on mobile) until the platform has answered it, it is
  discarded, it passes the offline age limit or the person signs out; no third-party map tiles; outbound calls: none beyond the
  platform API and the push services the platform configures.
- **Accessibility**: keyboard operation on the web, screen-reader labels, status by text not only colour, swipe actions
  with button equivalents, touch targets at least 44 pixels, contrast in both themes.
- **Compatibility**: every web locale and mobile language; installable on current desktop and mobile browsers; mobile
  app on its supported phone versions; older platforms without an area hide it.

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `TimeArea` | One area (check-in and attendance, shifts, time off) and whether it is available now |
| `HomeCard` | One card added to Home or My week, with its data, age and state |
| `CalendarLayer` | Attendance days, shifts, time off or holidays shown on the existing Calendar page |
| `QueuedAction` | An action taken offline with its device time, sequence, client id and send state |
| `SyncConflict` | A queued action the platform refused, with the reason and the record's current state |
| `CachedRecord` | A platform record kept for offline reading, with its age |
| `InboxDecision` | An existing Inbox approval item, with its facts and allowed decisions |

## 6. Out of Scope

- Records, rules, endpoints, notifications and approval routing: the platform specs listed in the header.
- Roster planning, presence boards beyond my team, policy and rate setup: the Gauzy web app.
- Expense claims, receipts, advances, travel, company cards, payslips, earned pay, tax declarations, HR records,
  recruiting, performance and learning: the Gauzy web app (installable on phones), not Ever Teams.
- Chat, meetings, calendar events, mail and documents: `workspace-collaboration-clients`.
- Office kiosk pages (platform `attendance-and-shifts`), face or selfie checks.

## 7. Acceptance Criteria

- [ ] **AC-1** With the flag on, the Ever Teams web app installs, opens standalone on Home and offers "Reload to update"
      after a deploy; switching push on keeps the app worker; with the flag off nothing changes, and once it is off
      again the existing inbox push worker is back and delivers push (FR-3).
- [ ] **AC-2** Home shows shift, check-in, time off, requests, exceptions and prompts beside the timer and daily plans;
      one card failing leaves the others (advanced: Home cards; FR-10, FR-12).
- [ ] **AC-3** Check-in with location proof inside and outside the radius, with location denied, and on a remote day
      behaves per FR-13 to FR-15.
- [ ] **AC-4** Offline: check-in, a time-off request and an Inbox decision are queued, survive a restart, sync in order
      with original times; a retry after a lost answer is applied once; a locked-day refusal lands in the conflict
      review with a correction action; Home stays readable under the offline banner; signing out with unsent items
      offers send, discard or stay signed in and leaves no record of the account on the device (advanced: offline
      queue; FR-8, FR-19, FR-20, FR-51).
- [ ] **AC-5** A time-off request shows its preview, submits, is approved by the manager by swipe with undo in the Inbox
      Decisions view, and the requester's list updates live (advanced: swipe approvals and digest; FR-25, FR-47, FR-48).
- [ ] **AC-6** With the flag on, this feature adds no expense, advance, travel, payslip or HR-editing entry to Ever Teams
      (web, mobile, extension), the existing profile rows and rates section stay as they are, and the profile section
      links to the Gauzy web app (FR-41–FR-44).
- [ ] **AC-7** A time-off decision notification opens the Inbox Decisions view from a closed app, and the decided request
      downloads its PDF where the platform prints one (FR-46, FR-57).
- [ ] **AC-8** Shift pickup, attendance correction, overtime request and compensatory claim each complete end to end;
      their Calendar layers show the result (FR-13, FR-28, FR-31).
- [ ] **AC-9** A user without an employee record, a platform without attendance, and blocked notifications each degrade
      as specified (FR-7, FR-8, FR-52, FR-54).
- [ ] **AC-10** The mobile app passes AC-3 to AC-5 and AC-7 for the areas it ships (plan §8) (FR-4).
- [ ] **AC-11** With the feature off, and with the feature on and default settings, every existing page, route, field, permission and report behaves as today (FR-1).
- [ ] Every new string present in every locale file
- [ ] Behind the runtime flag; nothing changes while it is off
- [ ] All functional requirements have a passing test

## 8. Open Questions

- Mobile push needs a device registration for phones on the platform's push devices; applied default: the phone
  registers through the existing push devices with a device kind added by the platform's inbox; without that device
  kind the mobile app relies on the in-app list and live updates.
- Mobile parity order; applied default: check-in, time off and Inbox decisions in the second phase, shifts and the
  attendance layers in the third.
- Offline age limit for check-ins follows the platform setting (default 7 days); nothing older is sent.
- No map is shown on check-in (applied); a map would be an outbound call to list and opt into.
- The Gauzy web app links (FR-46, FR-52) need the deployment's Gauzy web app address in the runtime config; applied
  default: without it the links are hidden.

## 9. Constitution Gates

- [x] I Platform API is the backend — every record and endpoint belongs to the platform specs; route handlers proxy.
- [x] II Layered web app — services, hooks, stores, components, pages per area.
- [x] III Every string translated — web locales and mobile tables.
- [x] IV Runtime config; default-off flag; nothing removed — `NEXT_PUBLIC_PEOPLE_SELF_SERVICE_ENABLED`; the existing
      Home, Inbox, Calendar, Settings, offline page, push worker and timer stay and are extended.
- [x] V One design system — common wrappers, tokens, central icons.
- [x] VI Security and privacy — tokens server-side, encrypted cache on mobile, location at the tap only, no map tiles.
- [x] VII Real-time through the platform channel — shared real-time client; documented 60-second fallback.
- [x] VIII Multi-client parity stated — web first; mobile, desktop and extension in §1 and the plan.
- [x] IX Tests and gates — hooks, queue, conflict review, pages.
- [x] X Behaviour-first (this document).
- [x] XI Documentation describes our product only.

## 10. References

- Platform specs (Ever Gauzy repository, `docs/specs/features/`): [`attendance-and-shifts`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/attendance-and-shifts/spec.md), [`time-off-management`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/time-off-management/spec.md),
  [`approval-workflows`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/approval-workflows/spec.md), [`calendar-and-scheduling`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/calendar-and-scheduling/spec.md), [`automation-and-notifications`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/automation-and-notifications/spec.md), [`custom-fields-and-forms`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/custom-fields-and-forms/spec.md)
- Related features: [`inbox`](../inbox/spec.md), [`realtime-client`](../realtime-client/spec.md), [`workspace-collaboration-clients`](../workspace-collaboration-clients/spec.md)
- Existing code: `apps/web/app/[locale]/page-component.tsx` (Home), `apps/web/core/components/dashboards/my-week/`,
  `apps/web/core/components/calendar/calendar-page.tsx`, `apps/web/core/components/pages/inbox/inbox-decision.tsx`,
  `apps/web/core/components/settings/pages/profile/profile-settings-page.tsx`,
  `apps/web/core/components/common/offline-wrapper.tsx`, `apps/web/public/inbox-push-sw.js`,
  `apps/web/core/hooks/realtime/`, `apps/mobile/app/navigators/authenticated-navigator.tsx`

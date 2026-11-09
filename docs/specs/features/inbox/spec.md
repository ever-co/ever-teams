# Feature Specification: Inbox page

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `inbox`
**Branch**: `feat/inbox-page`
**Status**: `Draft`
**Created**: 2026-11-07
**Last updated**: 2026-11-07
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_INBOX_ENABLED` (exists, default off)
**Platform API dependency**: platform spec `inbox` (extends the employee-notification API the bell already uses)

---

## 1. Overview

The app already has a notification bell with a 50-entry popover (read, unread, archive,
mark all read, filters, per-type settings) and a gated "Inbox" sidebar entry whose page
does not exist. This feature adds the **Inbox page** at `/inbox`: a full, paginated,
keyboard-navigable inbox with a list and a detail pane, grouping by source (tasks, chat,
docs, integrations, people), triage actions (read, unread, archive, snooze, done, bulk),
and a settings page where each person chooses in-app, email and push delivery per
notification kind. Entries open their exact target (a comment, a chat message, a page
block) in place. New entries arrive live when the real-time client is connected.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** the flag is on, **when** a user clicks Inbox in the sidebar, **then** they see
  their entries newest first, grouped by day, with tabs All / Unread / Mentions /
  Assigned and a source filter; the first entry is focused for keyboard use.
- **Given** an entry about a task comment, **when** the user presses Enter or clicks it,
  **then** the task opens in the detail pane scrolled to that comment, and the entry is
  marked read.
- **Given** an entry about a chat mention, **when** opened, **then** the conversation
  opens at that message (in the pane when chat is enabled, otherwise as a link).
- **Given** forty unread entries, **when** the user presses `Shift+Escape` or clicks
  "Mark all as read", **then** all become read with an Undo toast for a few seconds.
- **Given** an entry, **when** the user chooses Snooze → Tomorrow morning, **then** it
  leaves the list and returns unread at that time, with a "snoozed" filter to find it.
- **Given** the user selects several entries with `X` or checkboxes, **when** they choose
  Archive, **then** all selected entries are archived in one action.
- **Given** the settings page, **when** the user turns email on for "Assigned to me" and
  picks a daily digest for "Comments on my tasks", **then** the choices save and the page
  shows them on reload.
- **Given** the browser supports push, **when** the user enables push on this device,
  **then** the browser asks for permission once and the device appears in the list with a
  remove action.

### 2.2 Edge cases & failures

- **Given** the platform predates the inbox extension, **when** the page loads, **then**
  it works with the existing bell data (read/unread/archive only) and hides snooze, done,
  grouping and channel settings.
- **Given** an entry whose task was deleted, **when** opened, **then** the pane says the
  item is no longer available and offers to archive the entry.
- **Given** the flag is off, **when** `/inbox` is visited directly, **then** the user is
  sent home; the sidebar shows no Inbox entry.
- **Given** email is not configured on the platform, **when** the settings page loads,
  **then** email options are shown disabled with an explanation.
- **Given** a user on a phone, **when** they open the Inbox, **then** the list fills the
  screen and opening an entry navigates to the target instead of a side pane.

## 3. Functional Requirements

- **FR-1** The app MUST provide `/inbox` with cursor pagination (infinite scroll), day
  grouping, tabs All / Unread / Mentions / Assigned, a source filter and a snoozed filter.
- **FR-2** Each entry MUST show the actor's avatar and name, the event sentence in the
  user's language, the target title, the source icon and a relative time, and MUST open
  its exact target: task (drawer or pane), comment (scrolled to), chat message, page block,
  integration item or people page.
- **FR-3** Triage actions MUST include read, unread, archive, unarchive, snooze (presets
  and custom time), done, and mark all read with undo; all MUST be available on single
  entries, on multi-selection and by keyboard (`J`/`K` move, `X` select, `E` archive,
  `H` snooze, `Enter` open, `Shift+Escape` mark all read).
- **FR-4** The bell popover MUST stay as the compact view and MUST link to the page.
- **FR-5** The settings page MUST let the user set, per kind, in-app (always on), email
  (immediate / digest / off) and push (on / off), a do-not-disturb window and the digest
  hour, and MUST manage push subscriptions for the current device.
- **FR-6** Unread counts in the bell and the sidebar MUST update live when the real-time
  client is connected and on the existing polling cadence otherwise.
- **FR-7** The page MUST degrade to the existing capabilities when the platform lacks the
  inbox extension, detected once per session.
- **FR-8** `/inbox` MUST be a protected path (anonymous users are redirected to sign-in
  server-side).
- **FR-9** Every string MUST exist in every locale; brand text MUST use `{appName}`.

## 4. Non-Functional Requirements

- **Performance**: first page of entries visible under 1 s on a warm cache; the page is
  lazily loaded and stays within the page-weight budget.
- **Reliability**: optimistic triage with rollback on failure (as the bell does today).
- **Security & privacy**: entries are the signed-in employee's only; targets are opened
  through existing permission-aware views.
- **Accessibility**: list rows are focusable with visible focus; actions reachable by
  keyboard; live region announces "N new notifications".
- **Compatibility**: web first; mobile gets the list and open-target in the same release
  (see §8), desktop wraps the web.

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `InboxEntry`     | A notification for the signed-in employee with kind, actor, target, state and source |
| `InboxFilter`    | Tab, source and state selection kept in the URL |
| `DeliveryPreference` | Per-kind email and push choices, do-not-disturb window, digest hour |
| `PushDevice`     | A push subscription of this browser |

## 6. Out of Scope

- Shared or team inboxes.
- Email thread reading inside the app.
- Mobile native push registration (requires store builds).

## 7. Acceptance Criteria

- [ ] `/inbox` lists, filters, paginates and groups entries; keyboard navigation works.
- [ ] Opening entries lands on the exact comment, message or block.
- [ ] Snooze, done, bulk archive and undoable mark-all-read work and survive reload.
- [ ] Settings save per-kind channels, DND and digest hour; push device registers and removes.
- [ ] With an older platform the page still works with read/unread/archive only.
- [ ] Every new string present in every locale file; behind `NEXT_PUBLIC_INBOX_ENABLED`.
- [ ] All functional requirements have a passing test.

## 8. Open Questions

- `[NEEDS CLARIFICATION: mobile scope in the first release — list + open target only, or also triage actions (proposed: list, open, read/unread; the rest follows)]`

## 9. Constitution Gates

- [x] I Platform API is the backend — employee-notification API and its inbox extension.
- [x] II Layered web app.
- [x] III Every string translated.
- [x] IV Runtime config; default-off flag; nothing removed — bell stays.
- [x] V One design system.
- [x] VI Security and privacy.
- [x] VII Real-time through the platform channel.
- [x] VIII Multi-client parity stated.
- [x] IX Tests and gates.
- [x] X Behaviour-first (this document).
- [x] XI Documentation describes our product only.

## 10. References

- Platform spec: `inbox` (Ever Gauzy repository, `docs/specs/features/inbox/`)
- Related: [`../realtime-client/spec.md`](../realtime-client/spec.md), [`../chat/spec.md`](../chat/spec.md)

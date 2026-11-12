# Implementation Plan: Inbox page

**Feature**: `inbox` · **Spec**: [`spec.md`](./spec.md) · **Branch**: `feat/inbox-page` · **Status**: In progress (2026-11-07)

## 1. Summary

`/inbox` behind `NEXT_PUBLIC_INBOX_ENABLED` (runtime flag, exists): the signed-in person's items from the
platform inbox (`/inbox/items`, where every platform notification is filed as an item with the person's read /
archive / snooze / done state), newest first, grouped by day, with tabs (All / Unread / Mentions / Assigned and
Snoozed / Done / Archived), a source filter, search, triage actions on single entries and selections, keyboard
navigation, a detail pane, and mark-all-read with undo. On a platform without the inbox extension the page works
with the bell's data (read, unread and archive only). Settings stay on the existing per-type page; channels (email,
push) follow with the platform's delivery preferences.

## 2. Reuse

| Need | Existing piece | How it is used |
| --- | --- | --- |
| Platform data | `/inbox/items` (`tab`, `unread`, `q`, `cursor`), `/inbox/items/counts`, `/inbox/items/mark-all-read`, `PATCH /inbox/items/:id/state` | `inboxService` + proxy routes `app/api/inbox/items/**` |
| Fallback data | `employeeNotificationService`, `useNotificationInbox`, `useNotificationActions` | the page's legacy mode |
| Entry sentences | `notifications.EVENTS.*` strings, `senderNameFromTitle`, `quotedSubjectOf` | `toInboxEntry` reads the platform title the way the bell does |
| Avatars and task titles | `activeTeamState.members` (`personFromTeamMember`), `tasksByTeamState` | the rows and the detail pane |
| Targets | `useTaskDrawer` (task), `href` (people / chat) | `handleOpen` |
| Chrome | `PageLayout`, `SegmentedControl`, `DropdownMenu`, `Checkbox`, `Button`, notification states | the page |
| Query keys | `queryKeys.inbox.*` (new group) — the real-time client invalidates the `inbox` prefix | hooks |

## 3. Modules

| Module | Responsibility |
| --- | --- |
| `core/types/interfaces/common/inbox-item.ts` | the platform's item, tabs, kinds, page, counts, state input |
| `core/services/client/api/inbox/inbox.service.ts` | `list`, `counts`, `getItem`, `setState`, `markAllRead` |
| `app/api/inbox/items/**` | proxy-mode twins (`forwardToGauzy`) |
| `core/lib/utils/inbox-entry.ts` | item → `InboxEntry` (type, sender, subject, target, state, source group), filters, snooze presets, day groups, focus walk |
| `core/lib/utils/inbox-enabled.ts` | the runtime flag (shared with the sidebar and the bell) |
| `core/hooks/inbox/*` | scope, availability probe (404 once per session), infinite items, counts, optimistic actions with undo, keyboard |
| `core/components/pages/inbox/*` | the page, rows, snooze menu, detail pane, skeleton |
| `app/[locale]/(main)/inbox/page.tsx` | the route (`withAuthentication`); `/inbox` is a protected path |

## 4. Rules

- The list is the platform's tab (and `unread`); Mentions / Assigned and the source filter narrow each page on the
  client (as the bell does). Snoozed, done and archived entries show only under their own filters.
- Actions apply to the selection when the acted-on entry is part of it, else to that entry; every action is
  optimistic across every cached page and rolled back when the platform refuses; archive, snooze, done and
  mark-all-read offer Undo.
- Keyboard: `J` / `K` (arrows) move, `X` select, `E` archive, `H` snooze until tomorrow, `D` done, `U` read,
  `Enter` open, `Shift+Escape` mark all read; letters are ignored in text fields.
- Legacy mode: no snooze, done, secondary tabs or search; a notice says so.
- Live updates come through the shared real-time client (`realtime-client` feature) by query invalidation.

## 5. Tests

`inbox-entry` (mapping, state, source groups, filters, tabs, snooze presets, grouping, focus walk).

## 6. Later

- ~~Delivery preferences (email immediate / digest, push) and DND once the platform exposes them.~~ Done (T10): the
  notification settings page saves `preferences.emailByType` / `email`, `dnd`, `digestHour` and `pushByType`
  (the platform reads a kind's own push switch, else `push`, else on once a device is registered), switches
  browser notifications for this device (`/inbox/push-subscriptions`, worker `public/inbox-push-sw.js`) and lists
  the person's devices with a remove action. All of it shows only with `NEXT_PUBLIC_INBOX_ENABLED` and a platform
  that answers the push routes. Still open: email shown disabled where the platform has no mail (the platform
  exposes no signal for it yet).
- ~~Decisions (questions / approvals) answered in the detail pane.~~ Done (T9).
- ~~Mobile: list and open-target first.~~ Done (T11): `opensInboxTarget` / `showsInboxSheet` in `inbox-entry.ts`.

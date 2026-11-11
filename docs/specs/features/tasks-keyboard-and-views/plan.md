# Implementation Plan: Tasks — keyboard-first lists, command palette, bulk actions, saved views

**Feature ID**: `tasks-keyboard-and-views` · **Spec**: [`spec.md`](./spec.md) · **Branch**: `feat/tasks-keyboard-and-views` · **Status**: Phase 1 in review (2026-11-07)

## 1. Summary

Builds on the platform's task views extensions (`task-views-and-bulk-actions`, merged) behind
`NEXT_PUBLIC_TASK_VIEWS_ENABLED` (read at runtime, off by default): saved views stored on the platform (personal or
team), the four built-in views, a bulk path for the selection bar with one undo, and a shortcut registry with
rebinding kept on the platform. The Team tasks page keeps its device-local view, its keys and its pickers exactly as
they are with the flag off.

## 2. Reuse

| Need | Existing piece | How it is used |
| --- | --- | --- |
| The list, its keys and pickers | `useTeamTasksView`, `TeamTasksList` (J/K, X, Enter, S/P/L/D), `TeamTaskPicker`, `TeamTasksSelectionBar` | the page takes an initial definition and a task override; the selection bar gains Labels and Archive; the pickers' writes take the bulk path for a selection |
| View settings | `TeamTasksViewSettings`, `TeamTasksFilters`, `TeamTasksScope`, the storage readers | a view's three JSON columns hold them (`definitionOf` / `columnsOf`) |
| Per-task writes | `useTeamTaskUpdates` → `useUpdateTask` (optimistic, queued) | kept for one task and with the flag off |
| Palette | `SidebarCommandModal` groups, `useKeyboardShortcuts` | a "Go to" group from the registry; its keys are the registry's |
| Help | `KeyboardShortcuts` dialog (`H`) | kept; the new `?` dialog lists the registry and records bindings |
| Undo toasts | sonner `toast(…, { action })` as in Docs and the Inbox | bulk update undo |
| Proxies | `forwardToGauzy` route twins | `/api/task-views/**`, `/api/tasks/built-in/[key]`, `/api/tasks/bulk-update`, `/api/user/ui-preferences` |
| Flags | `isDocsEnabled` pattern (`readRuntimeEnv`) | `isTaskViewsEnabled` |

## 3. Modules (`apps/web`)

| Module | Responsibility |
| --- | --- |
| `core/types/interfaces/common/task-views.ts` | the view, its definition, visibility and built-in keys, the bulk changes / items / outcome, the platform's limit |
| `core/lib/utils/task-views.ts`, `task-views-enabled.ts` | definition ↔ columns, equality, built-in key check, sort, the flag |
| `core/lib/keyboard/shortcuts.ts` (+test) | the registry: commands, contexts, default bindings; parsing and formatting, key caps, physical-key chords, overrides, conflicts, browser-reserved, sequence walking |
| `core/services/client/api/task-views/task-views.service.ts`, `users/ui-preferences.service.ts` | the platform calls |
| `core/hooks/task-views/*` | scope, the views query and one view, actions (create / save with `expectedVersion` → conflict error / rename / share / delete), built-in tasks, bulk update with undo |
| `core/hooks/keyboard/*` | preferences (overrides from the user, saved to the platform), the one key listener and handler registration, the palette's "go to" commands |
| `core/stores/common/shortcuts.ts` | registered handlers, active contexts, the help dialog's state |
| `core/components/common/shortcuts-dialog.tsx`, `layouts/app/keyboard-shortcuts-mount.tsx` | the help with recording; the mount in the main layout with the global commands |
| `core/components/pages/teams/team/tasks/views/*` | `/views` list, the route host (saved or built-in), the save / rename dialog, the toolbar's view actions |
| `core/components/pages/teams/team/tasks/list/*` | the page takes a view context; the toolbar shows the view's title and actions; the selection bar's new actions |
| `app/[locale]/(main)/views/**`, `app/api/**` | routes and proxies |

## 4. Rules

- **Views** keep the page's grouping, ordering, properties, filters, scope and search. A personal view is listed to
  its creator only; a team view to everyone in the team, and changed (saved, shared, deleted) by anyone in it who may edit
  tasks — the platform's rule; Save, Share and Delete are shown to those people only. A save states the version read;
  a stale one shows a conflict with a Reload action. Opening a view never touches the device-local view.
- **Manual order** (T11): only a saved view offers the Manual ordering (the device's view has no order to follow).
  It lists the tasks its `manualOrder` names, in that order, then the others newest first, as the platform pages
  them, inside each group and whatever the direction. A move ("this task right before / after that one", by drag
  within a group or from the row menu) is saved at once with `PUT /task-views/:id/order` and the version the page
  holds; the shown tasks the order did not name yet join it as shown, hidden ones keep their places, at most 5000. A
  409 makes the same move once on the order saved meanwhile; a second one, or another failure, says so and the list
  shows what the platform holds. The move is not part of Save's changes, and a change in progress builds on the
  version the move wrote only when the move stated the change's base. Save as copies the order. On touch screens the
  rows do not drag: the row menu (a long press) moves them (T12).
- **Built-in views** are the platform's answer (no local filtering besides the page's own search and filters).
- **Bulk**: a change to more than one task goes in one request with the previous values coming back; undo sends
  them back as `items`. One task, or the flag off: one update per task as before.
- **Keys**: a letter matches the physical key; a chord with ⌘/Ctrl fires inside text fields too. The registry runs
  only commands with a registered handler, so the page's own keys are never shadowed; its listener is mounted
  only with the flag. Overrides are stored as `uiPreferences.keyboard.bindings` (an empty string removes a
  default). Phase 2 (T8): the list's letters (J/K/X, S/P/L/D) can be rebound; the list matches them itself on a
  focused row (one chord each, no ⌘/Ctrl; Shift on a bare binding extends the selection or opens the picker, and
  counts as the command's key in conflicts), ↑/↓, Enter, O and Esc stay built in,
  and while a registry sequence is under way the list leaves the next key to it. With the flag off the list keeps
  its default keys by the character typed, as before. A stored override the help would refuse, or one that clashes with another binding in
  force, falls back to its default (clashes settled in registry order, swaps kept), so the bindings in force never
  clash; a sequence under way is dropped when the runnable bindings change.
- **Flag off**: no mount, no sidebar section, no routes' content, the selection bar as before.

## 5. Tests

`core/lib/keyboard/shortcuts.test.ts` (parsing, key caps, physical keys, overrides, conflicts, sequences, row keys,
refusals); `team-tasks-list.test.tsx`, `shortcuts-dialog.test.tsx` and `use-shortcuts.test.tsx` (T8). The
in-cluster web gate runs lint, knip, jest and the build.

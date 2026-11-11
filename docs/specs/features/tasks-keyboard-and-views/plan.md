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
- **Palette keys (T13)**: with the flag on, every command palette entry runs a registry command (rebindable, listed in
  the help) and shows its binding in force, or no key when nobody can run it right now; the palette's own listener
  gets no keys then. Its old sequences clashed with the registry (`C T` and `C P` start with `C`, which creates a task
  at once; `S T` with `S`, the status picker of a focused row; `A M` with the coming `A`; the "⌘" ones were a letter
  then ⌘ plus a letter, often a browser key: `⌘T`, `⌘P`, `⌘H`, `⌘K`), so they got new defaults, chosen so that no
  default starts with `C`, a row letter (J K X S P L D, M in T10) or a key the list keeps:

  | Entry | Command | Was | Now |
  | --- | --- | --- | --- |
  | Create task / Settings / Go to my team's tasks | `taskCreate` / `settingsOpen` / `goTasks` | `C T` / `⌘S` / `⌘TT` | `C` / `Mod+,` / `G T` (as in T5) |
  | Create new team / project, Invite user | `teamCreate`, `projectCreate`, `inviteUser` | `⌘CT`, `C P`, `I U` | `N T`, `N P`, `N U` ("new") |
  | Search tasks / projects / teams | `searchTasks`, `searchProjects`, `searchTeams` | `S T`, `⌘SP`, `⌘ST` | `/ T`, `/ P`, `/ M`: the palette opens on that tab |
  | Go to home / projects / Kanban / my tasks and Profile | `goHome`, `goProjects`, `goKanban`, `goProfile` | `⌘H`, `⌘TP`, `⌘K`, `⌘MT` and `⌘P` | `G H`, `G P`, `G K`, `G U` |
  | Timesheets / weekly limit / time & activity reports | `goTimesheets`, `goWeeklyLimit`, `goTimeActivity` | `⌘TS`, `⌘WL`, `⌘TA` | `G S`, `G L`, `G A` |
  | Toggle theme | `themeToggle` | `T H` | `T H` (no clash) |
  | Assign to me | none | `A M` | none: it has no action yet; it gets a command once it does |

  The palette registers the handlers only it can run (its dialogs, its tabs, the links that need the signed-in
  person); the layout keeps Create task, Settings and the "go to" views. A digit key pressed with Shift that types
  punctuation is that character (`/` is Shift+7 on a German layout), so `/ T` works there too. With the flag off the
  palette keeps its own keys exactly as before.
- **Palette results (T9)**: with the flag on, a search also lists the people of the active team (to their profile),
  the projects (archived ones left out, every word of the search in the name) and, with Docs on, the pages (the
  platform's Docs search, their text included, best match first), each kind with its own tab, at most eight per kind.
  The conversations, and the people to write to, are the chat's own palette results (chat phase 2,
  `palette-chat-results.tsx`, with the chat on). The empty field shows the entries last opened from the palette (six,
  per person, on this device; a stored entry leading outside the app is dropped, a page is not listed while Docs is
  off). A sequence typed into the field, one key per word (`g t`), runs its command as its keys would; the entries are
  also found by their binding (`gt`).
- **Flag off**: no mount, no sidebar section, no routes' content, the selection bar as before.

## 5. Tests

`core/lib/keyboard/shortcuts.test.ts` (parsing, key caps, physical keys, overrides, conflicts, sequences, row keys,
refusals; T13: the defaults never clash, typed sequences); `team-tasks-list.test.tsx`, `shortcuts-dialog.test.tsx`
and `use-shortcuts.test.tsx` (T8); `palette-items.test.ts`, `palette-recent.test.ts` and
`sidebar-command-modal.test.tsx` (T9, T13). The
in-cluster web gate runs lint, knip, jest and the build.

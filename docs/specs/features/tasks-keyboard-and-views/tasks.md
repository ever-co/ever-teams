# Task Breakdown: Tasks — keyboard-first lists, command palette, bulk actions, saved views

**Feature ID**: `tasks-keyboard-and-views`
**Plan**: `./plan.md`
**Status**: `In review`
**Last updated**: 2026-11-11

---

## Phase 1 — Views, bulk, registry (lane T5, PR 1)

- [x] **T1**. Types, flag, helpers (definition ↔ columns, equality), the platform client and the proxies
- [x] **T2**. Saved views: list and one view queries, create / save (with `expectedVersion`) / rename / share / delete; `/views` and `/views/[viewId]`; the page on a view (memory state, dirty, Save, Save as, Rename, Share, Delete, conflict → Reload); sidebar section; `Mod+S`
- [x] **T3**. Built-in views from the platform (`mine`, `this-week`, `overdue`, `due-soon`)
- [x] **T4**. Bulk path for a selection (status, priority, size, assignee, labels, archive) with one undo; Labels and Archive on the selection bar
- [x] **T5**. Shortcut registry (pure, with a spec): contexts, defaults, sequences, physical keys, overrides, conflicts, reserved; preferences on the platform; the listener and handler registration; the help dialog with recording; the palette's "Go to" group
- [x] **T6**. Strings ×13, `.env.sample`, `/views` protected
- [ ] **T7**. Cluster web gate green; bot threads answered; manual check on dev (save / open / conflict, bulk + undo, rebind a key and see it in the palette)

## Phase 2

- [x] **T8**. Rebindable list and task keys (J/K/X/S/P/L/D through the registry): the list matches the bindings in force on a
  focused row (one chord each, Shift on a bare binding extends), ↑/↓, Enter, O and Esc stay built in, the help refuses a
  sequence, ⌘/Ctrl or a built-in key for them (with Shift added, still theirs in conflicts), and the second key of a
  registry sequence (`G O`) is left to the registry
- [ ] **T9**. Palette results for people, projects, pages and conversations; recent items; "Go to" sequences inside the palette input
- [ ] **T10**. Project and due-date bulk actions; multi-select on the kanban; views for the kanban layout
- [x] **T11**. Manual ordering of a view (`PUT /task-views/:id/order`) with drag and drop: a saved view offers the
  Manual ordering (Display); a row drags within its group (mouse or pen), the row menu moves a task up, down, to the
  top or the bottom of its group; each move is shown at once and saved with the version read, a 409 makes the same
  move once more on the order saved meanwhile, and Save as keeps the order
- [x] **T12**. Saved views on mobile (phone widths): the row menu's moves order a view by touch (a long press opens
  it; rows do not drag on touch), the phone's sidebar sheet closes once one of its links (a view) opened a page, and
  the views list shows who sees each view
- [ ] **T13**. The palette's existing sequences (`I U`, `A M`, `T H`, `C T`, `S T`, `C P`, the ⌘ ones) from the registry too
  (split from T8): several clash with `C` and the row letters today, so they need new defaults first

**Status 2026-11-07:** phase 1 on ever-teams `feat/tasks-keyboard-and-views` (PR opened with the lane; the cluster gate and the bots next).

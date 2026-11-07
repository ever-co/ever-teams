# Feature Specification: Tasks — keyboard-first lists, command palette, bulk actions, saved views

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `tasks-keyboard-and-views`
**Branch**: `feat/tasks-keyboard-and-views`
**Status**: `Draft`
**Created**: 2026-11-07
**Last updated**: 2026-11-07
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_TASK_VIEWS_ENABLED` (default off)
**Platform API dependency**: platform spec `task-views-and-bulk-actions` (saved views, bulk update, filter contract)

---

## 1. Overview

The task list, kanban and table already cover grouping, ordering and filtering, but the
settings live only in the browser, there are no bulk actions, and the keyboard reaches
only the command palette. This feature makes tasks keyboard-first: a shortcut registry
with a help dialog and rebinding, `J`/`K` row focus, single-key property changes
(`S` status, `P` priority, `A` assignee, `L` labels, `Shift+D` due date), multi-select
with a bottom bulk toolbar (status, priority, assignee, labels, project, archive),
**saved views** stored on the platform (personal or shared with the team) with filters,
grouping, ordering and layout, built-in views (My tasks, This week, Overdue, Due soon),
and a command palette that finds tasks, pages, conversations, people and actions with
"Go to" sequences.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** a task list, **when** the user presses `J` and `K`, **then** focus moves
  down and up with a visible focus ring; `Enter` or `O` opens the task drawer; `Escape`
  closes it.
- **Given** a focused task, **when** the user presses `S`, **then** a status picker opens
  at the row; choosing applies immediately with an undo toast.
- **Given** a list, **when** the user presses `X` on three rows, **then** a bottom toolbar
  shows "3 selected" with status, priority, assignee, labels, project and archive
  actions; applying changes all three in one request with one undo.
- **Given** a filtered and grouped list, **when** the user presses `Mod+S`, **then** they
  name the view, choose personal or team, and it appears under Views in the sidebar; the
  URL `/views/[viewId]` reopens it.
- **Given** a team view, **when** a teammate changes its filters and saves, **then**
  everyone sees the change; a personal view is visible only to its owner.
- **Given** the command palette, **when** the user types "G T", **then** "Go to Team's
  tasks" runs; typing a task number or title shows matching tasks; typing a person shows
  their profile; with chat and docs enabled, conversations and pages appear too.
- **Given** the shortcuts help (`?`), **when** opened, **then** every shortcut is listed by
  area with its current binding, and the user can rebind keys with conflict detection;
  bindings follow the user across devices.
- **Given** a non-Latin keyboard layout, **when** the user presses the physical key for
  `J`, **then** the shortcut still works.

### 2.2 Edge cases & failures

- **Given** a text field is focused, **when** the user types `S`, **then** no shortcut
  fires.
- **Given** a bulk update that partly fails, **when** the response arrives, **then** the
  succeeded tasks stay changed, the failed ones are listed, and undo covers the succeeded
  ones.
- **Given** a saved view whose project was archived, **when** opened, **then** the list
  shows the view with a notice and an action to edit its filters.
- **Given** the platform lacks saved views, **when** the flag is on, **then** views stay
  local (today's behaviour) and the Save action explains that sharing needs a newer
  platform.
- **Given** a browser-reserved shortcut, **when** the user tries to bind it, **then** the
  dialog refuses with a reason.

## 3. Functional Requirements

- **FR-1** The app MUST have one shortcut registry that drives key handling, the command
  palette entries, the help dialog and the settings page; contexts (global, list, task,
  chat, docs, editor) MUST prevent conflicts; sequences like `G T` MUST be supported.
- **FR-2** Default bindings MUST include: `Mod+K` palette, `?` help, `C` create task,
  `Mod+,` settings, `G T/M/W/O/V/D/C/I` go-to (tasks, my tasks, this week, overdue,
  views, docs, chat, inbox), list `J/K/O/Enter/X/Shift+J/Shift+K/Mod+A/Escape/F/Shift+V/
  Mod+S/Mod+B`, task `S/P/A/I/L/Shift+D/Shift+P/Mod+Shift+O/Mod+./Mod+Shift+,/
  Mod+Backspace`, task detail `J/K/Escape/Mod+Enter`.
- **FR-3** Users MUST be able to rebind shortcuts with conflict detection and swap,
  stored on the platform per user, with physical-key matching for non-Latin layouts and
  refusal of browser-reserved combinations.
- **FR-4** Lists MUST support multi-select (click, `X`, shift ranges, select all) and a
  bulk toolbar applying status, priority, assignee, labels, project and archive to up to
  100 tasks in one request with undo.
- **FR-5** Saved views MUST store filters (and/or groups, relative dates), grouping,
  ordering, layout and visible properties; MUST be personal or team-shared; MUST be
  listed in the sidebar and the palette; MUST open at `/views/[viewId]` and keep a task
  open inside the view at `/views/[viewId]/[taskId]`.
- **FR-6** Built-in views My tasks, This week, Overdue and Due soon MUST exist without
  saving and MUST be computed by the platform in the user's time zone.
- **FR-7** The command palette MUST search tasks, people, projects and (when enabled)
  pages and conversations, list actions with their shortcuts, show recent items on an
  empty query, and keep results steady while typing.
- **FR-8** Every string MUST exist in every locale; shortcut labels MUST be localised
  while key names stay literal.
- **FR-9** Existing local view settings MUST keep working when the platform lacks saved
  views; nothing is removed.

## 4. Non-Functional Requirements

- **Performance**: key handling under 16 ms; palette results under 200 ms warm; bulk
  update round trip under 1 s for 100 tasks.
- **Reliability**: undo restores previous values exactly; local view settings migrate
  into saved views on first save.
- **Security & privacy**: a personal view is seen and changed by its creator only; a team view is changed by
  anyone in the team who may edit tasks (the platform's rule), and its actions are shown to them only.
- **Accessibility**: focus ring visible; shortcuts never trap focus; help dialog is a
  proper dialog.
- **Compatibility**: web only for shortcuts; views and bulk actions reach mobile later.

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `Shortcut`       | A command with context, default binding and user override |
| `SavedView`      | A named, shareable combination of filters, grouping, ordering, layout and properties |
| `BulkAction`     | One request changing a property on many selected tasks |
| `PaletteItem`    | A searchable entry (task, person, page, conversation, action) |

## 6. Out of Scope

- Timeline/roadmap layout (may follow).
- Automations (auto-close parent when children close).

## 7. Acceptance Criteria

- [ ] Row focus, single-key property changes and bulk actions work with undo.
- [ ] Saved personal and team views round-trip through the platform and open by URL.
- [ ] Palette finds tasks, people, projects, pages, conversations and actions; sequences work.
- [ ] Rebinding works with conflicts and layouts handled; stored on the platform.
- [ ] Every new string present in every locale file; behind the flag.
- [ ] All functional requirements have a passing test.

## 8. Open Questions

- `[NEEDS CLARIFICATION: whether saved views replace the current local view storage on first use or coexist until the user saves (proposed: coexist; local settings become the "unsaved" state of the current view)]`

## 9. Constitution Gates

- [x] I Platform API is the backend — views, bulk updates and bindings stored on the platform.
- [x] II Layered web app.
- [x] III Every string translated.
- [x] IV Runtime config; default-off flag; nothing removed — local settings stay.
- [x] V One design system.
- [x] VI Security and privacy — team views gated.
- [ ] VII Real-time — change hints only.
- [x] VIII Multi-client parity stated.
- [x] IX Tests and gates.
- [x] X Behaviour-first (this document).
- [x] XI Documentation describes our product only.

## 10. References

- Platform spec: `task-views-and-bulk-actions` (Ever Gauzy repository)
- Related: [`../chat/spec.md`](../chat/spec.md), [`../docs/spec.md`](../docs/spec.md), [`../inbox/spec.md`](../inbox/spec.md)

# Feature Specification: Comments and trash

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `comments-and-trash`
**Branch**: `feat/comments-reactions-trash`
**Status**: `In Review`
**Created**: 2026-11-11
**Last updated**: 2026-11-11
**Owner**: app maintainers
**Runtime flags**: `NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED` (reactions), `NEXT_PUBLIC_TASK_TRASH_ENABLED` (trash); both default off.
Editing, deleting and resolving comments are not behind a flag: the platform has always allowed them.
**Platform API dependency**: platform spec `comments-and-trash` (ever-gauzy `docs/specs/features/comments-and-trash/`):
`GET /reaction/comments`, the server-stamped `editedAt`, `GET /tasks/trash` (`GAUZY_TASK_TRASH_ENABLED`).

---

## 1. Overview

A task's comments can be posted and replied to, with mentions, but not changed afterwards, and a deleted task is
gone for good. This feature lets people:

- **edit and delete their own comments**, with an "edited" marker the platform stamps;
- **resolve and reopen** a comment thread (a top-level comment and its replies), resolved threads folding to one line;
- **react** to comments with emoji, seeing counts and who reacted, and toggling their own reaction;
- find deleted tasks in a **trash** per team and per project, **restore** them, or **delete them for good** when they
  may.

## 2. User Scenarios

### 2.1 Comments: edit, delete, resolve

- **Given** a comment I wrote, **when** I open its menu and choose Edit, **then** the text turns into the comment
  field with my text and mentions; **Save** (or Ctrl/⌘+Enter) keeps the change, **Cancel** (or Escape) drops it.
  After a save the comment shows "(edited)", and hovering the marker shows when.
- **Given** I save the same text, **then** nothing is sent and the comment is not marked edited.
- **Given** a comment I wrote, **when** I choose Delete, **then** it leaves the list at once and a toast offers
  **Undo** for a few seconds; Undo brings it back where it was. Replies to a deleted comment stay, shown as comments
  of their own.
- **Given** someone else's comment, **then** I see no Edit or Delete in its menu.
- **Given** a thread I may change (I wrote its first comment), **when** I choose Resolve, **then** the thread folds to
  one line ("Resolved by me · 3 replies") with **Show** and **Reopen**; Reopen unfolds it.
- **Given** a thread someone else resolved, **then** I see who resolved it and can show it, but not reopen it.
- **Given** an edit, a delete or a resolve fails, **then** the comment stays as it was and a toast says it was not
  saved; the edit keeps my text in the field.

### 2.2 Reactions (flag on)

- **Given** a comment, **when** I click the smiley button and pick 👍, **then** a 👍 1 chip appears at once, marked as
  mine; clicking the chip again takes my reaction back.
- **Given** two colleagues reacted 🎉, **when** I hover the 🎉 2 chip, **then** the tooltip names them ("Ann Lee and
  Bo Ray reacted with 🎉"); past three names it says "and 2 others".
- **Given** a colleague reacts while I look at the task, **then** the counts change by themselves when live updates
  are on (`NEXT_PUBLIC_REALTIME_ENABLED`), otherwise the next time the comments are read (opening the task, the
  window regaining focus).
- **Given** the flag is off, or the platform does not serve the reaction summary, **then** no chip or smiley button
  shows and nothing about reactions is requested.
- **Given** a toggle fails, **then** the chip goes back to what it was and a toast says the reaction was not saved.

### 2.3 Trash (flag on)

- **Given** the flag is on and the platform has the trash, **when** I delete a task anywhere in the app, **then** it
  moves to the trash (the platform's soft delete) instead of being removed.
- **Given** the sidebar's Tasks group, **when** I open **Trash**, **then** I see the deleted tasks of the active team,
  most recently deleted first: number, title, project, who deleted it and when, with **Restore** and
  **Delete forever**. A search box finds a task by title or number; **Load more** reads the next page.
- **Given** a project page, **when** I open its **Trash** tab, **then** I see that project's deleted tasks the same
  way.
- **Given** I choose Restore, **then** the task leaves the trash and is back in the lists (a toast says so with
  **Open**).
- **Given** I choose Delete forever, **then** a confirmation names the task and says it cannot be undone; confirming
  removes it from the trash.
- **Given** I may not manage the trash (no delete permission and I do not manage the team), **then** the page says
  only managers can see it, and the sidebar keeps the entry (the platform decides).
- **Given** the platform answers that the trash is not enabled, **then** the page says the trash is not available on
  this server. Deletes still go to the platform's soft delete, which every platform version has: the tasks are not
  lost, but they can be restored only once the platform lists the trash. So `GAUZY_TASK_TRASH_ENABLED=true` is turned
  on for the platform before this flag (`.env.sample` says so).

### 2.4 Edge cases & failures

- **Given** a comment edited on another tab or by the platform since the list was read, **then** the next read shows
  the newest text (last write wins, as for every comment write today).
- **Given** a comment of mine with mentions, **when** I edit it and remove a mention, **then** that person is no
  longer listed as mentioned; a mention I add is notified as a new one.
- **Given** a phone-width screen, **then** comment menus and reaction chips stay reachable by touch (no hover-only
  control) and the trash rows wrap their actions under the title.

## 3. Out of scope

- Editing or deleting other people's comments (administrators keep doing it from the platform UI).
- Reactions on tasks, documents or chat (chat has its own).
- Automatic purge of old trash entries; parent-task automation (another lane).

## 4. Acceptance

- Unit tests: the edit/delete/resolve flows of the comments hook, the reaction grouping, toggling and tooltip names,
  the trash list, restore and delete-forever calls, and the delete switch to the trash under the flag.
- All strings in the 13 locales.
- With both flags off the app makes no new request and shows no new control besides comment edit/delete/resolve.

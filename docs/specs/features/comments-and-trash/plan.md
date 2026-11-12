# Implementation Plan: Comments and trash

**Feature ID**: `comments-and-trash`
**Spec**: `./spec.md`
**Tasks**: `./tasks.md`
**Platform**: ever-gauzy `docs/specs/features/comments-and-trash/` (PR ever-co/ever-gauzy#11802)
**Last updated**: 2026-11-11

## Platform routes used

| Use | Route | Notes |
| --- | ----- | ----- |
| Edit / resolve | `PUT /comment/:id` | `{ comment, mentionEmployeeIds }` or `{ resolved, resolvedAt, resolvedByEmployeeId }`; author only (or `CHANGE_SELECTED_EMPLOYEE`); `editedAt` stamped by the server |
| Delete / undo | `DELETE /comment/:id/soft`, `PUT /comment/:id/recover` | same ownership rule |
| Reactions | `GET /reaction/comments?entity=Task&entityId=…`, `POST /reaction` | the summary covers the comments the caller can list; `POST` toggles |
| Trash | `GET /tasks/trash`, `PUT /tasks/:id/recover`, `DELETE /tasks/:id/soft`, `DELETE /tasks/:id/trashed` (Delete forever: only while the task is in the trash, 404 otherwise; ever-gauzy#11851) | the list answers 404 unless `GAUZY_TASK_TRASH_ENABLED=true` |

The client calls the platform directly (`GAUZY_API_BASE_SERVER_URL`, as `commentService` already does); no Next route
is added.

## Client structure

- `core/lib/utils/comments-trash-flags.ts`: `isCommentReactionsEnabled()`, `isTaskTrashEnabled()` (runtime env, exact
  `true`).
- `core/services/client/api/comments/comment.service.ts`: `update`, `softDelete`, `recover`, `setResolved`.
- `core/services/client/api/comments/comment-reaction.service.ts`: `getForRecord`, `toggle`.
- `core/services/client/api/tasks/task-trash.service.ts`: `list`, `restore`, `deleteForever`, `moveToTrash`;
  `taskService.deleteTask` moves to the trash when the trash flag is on.
- `core/lib/utils/comment-reactions.ts` (pure): grouping by comment, the optimistic toggle, the tooltip names.
- `core/lib/utils/comment-ownership.ts` (pure): whether a comment is the caller's (employee, or posting user for an
  author-less comment), the mentions already in a text being edited.
- Hooks: `use-task-comments.ts` gains `editComment`, `deleteComment` (returns an undo), `setThreadResolved`;
  `use-comment-reactions.ts` (query keyed under the task's comments key, so a `comment.*` live hint refreshes it;
  optimistic toggle with rollback); `use-task-trash.ts` (infinite list, restore, delete forever).
- Components: `task-drawer-comments.tsx` (menu, inline edit, edited marker, resolve fold, reactions bar),
  `comment-reactions.tsx`, `pages/task-trash/task-trash-list.tsx`; route `/team/tasks/trash`; project tab `trash`;
  sidebar entry under Tasks.

## Data flow

- A `comment.*` hint (live updates on) invalidates `taskComments.byTask(...)`, which prefixes the reaction query:
  comments and reactions refetch together. The platform publishes `comment.updated` on a reaction change.
- A `task.*` hint invalidates `tasks.all`, which prefixes the trash query.
- Optimistic updates: reactions only (cheap, reversible). Edits, deletes and resolves wait for the platform and then
  refetch the thread; a delete hides the comment while its request runs.

## Risks

- A caller without `CHANGE_SELECTED_EMPLOYEE` lists only their own task comments on the platform (its employee scope);
  reactions follow the same scope. Not changed here; reported to the owner on the platform PR.
- The trash flag on a platform without the trash: the list answers 404 and the page says so; deletes still move to the
  soft-delete route, which every platform version has (it is the CRUD base's).

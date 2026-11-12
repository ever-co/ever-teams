# Task Breakdown: Comments and trash

**Feature ID**: `comments-and-trash`
**Plan**: `./plan.md`
**Status**: `In review`
**Last updated**: 2026-11-11

---

## Platform (ever-gauzy #11802, merged first)

- [ ] **P**. Reaction summary, reaction readability and change hint, server `editedAt`, `GET /tasks/trash`, trash grants

## Client (this repository)

- [x] **T1**. Spec, plan, tasks
- [ ] **T2**. Flags `NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED`, `NEXT_PUBLIC_TASK_TRASH_ENABLED`; `.env.sample`
- [ ] **T3**. Comment service: update, soft delete, recover, resolve; types (`editedAt`, `resolved*`)
- [ ] **T4**. Comments hook: edit, delete with undo, resolve; ownership helper; mentions kept on edit
- [ ] **T5**. Comment UI: menu, inline edit, edited marker, resolved threads fold
- [ ] **T6**. Reactions: service, grouping/toggle/tooltip helpers, hook with optimistic toggle, chips + picker
- [ ] **T7**. Trash: service, delete moves to trash under the flag, hook, list UI, `/team/tasks/trash`, project tab,
  sidebar entry
- [ ] **T8**. Strings in the 13 locales
- [ ] **T9**. Unit tests: comment flows, reactions, trash
- [ ] **T10**. Bot threads answered; manual check against a platform with #11802 (two users reacting, edit marker,
  trash restore / delete forever)
- [ ] **T11**. Delete forever through `DELETE /tasks/:id/trashed` (ever-gauzy#11851) and its proxy twin: a task
  restored meanwhile is not deleted (404), the page says so in the 13 locales and reads the list again; a task still
  linked from other records stays (409), and the page says so

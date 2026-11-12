# Tasks: Tasks — timeline layout of a view

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

- [x] **T1**. Layout `timeline` in the view model, its storage and the view hook (ungrouped, like the board)
- [x] **T2**. The timeline model (`team-tasks-timeline.ts`): days, bars, unscheduled tasks, today, ticks, the cap
- [x] **T3**. The timeline layout component, the Display menu entry, strings in 13 locales
- [x] **T4**. Unit and component tests; eslint, cspell and a typecheck of the changed files
- [ ] **T5**. Manual check with the saved-views flag on: a saved view switched to Timeline, both zooms, a phone width
- [x] **T6**. Drag a bar to change its dates: the body moves the dates the task has, an edge of a range moves that end
  (never past the other), Alt + arrows move by a day and Alt + Shift + arrows the due date; one update per drag
  (`useTeamTaskUpdates().setDates`); only the active team's tasks (another team's task only opens), as on the board
- [ ] **T7**. Later: the Angular timeline in the platform's web app, dependencies between tasks, rows grouped by
  assignee or project

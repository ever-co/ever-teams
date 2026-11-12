# Tasks: Tasks — timeline layout of a view

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

- [x] **T1**. Layout `timeline` in the view model, its storage and the view hook (ungrouped, like the board)
- [x] **T2**. The timeline model (`team-tasks-timeline.ts`): days, bars, unscheduled tasks, today, ticks, the cap
- [x] **T3**. The timeline layout component, the Display menu entry, strings in 13 locales
- [x] **T4**. Unit and component tests; eslint, cspell and a typecheck of the changed files
- [ ] **T5**. Manual check with the saved-views flag on: a saved view switched to Timeline, both zooms, a phone width
- [ ] **T6**. Later: drag a bar to change its dates (writes `startDate` / `dueDate`), and the Angular timeline

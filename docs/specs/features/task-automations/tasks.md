# Tasks: Settings → Automations

**Feature**: `task-automations` · **Plan**: [`plan.md`](./plan.md) · **Branch**: `feat/task-automations`

- [x] T1 Flag, types, `taskAutomationsService`, proxies + route-surface counts
- [x] T2 Hooks: scope, availability probe (404 / 403), rules, runs, optimistic switch and reorder + specs
- [x] T3 Form ↔ rule mapping, validation, ordering + specs
- [x] T4 Page: list, switch, reorder, template picker, editor, dry run, history, delete, skeleton
- [x] T5 Settings entry (manager-only, hidden by the flag and on 404), route, `settings.automations` strings in the 13 locales
- [ ] T6 Manual check against a platform with `GAUZY_TASK_AUTOMATIONS_ENABLED=true` (ever-gauzy#11804)

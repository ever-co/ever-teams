# Plan: Tasks — timeline layout of a view

**Spec**: [spec.md](./spec.md) · **Branch**: `feat/task-timeline`

## Shape

- `core/lib/utils/team-tasks-view.ts`: `TeamTasksLayout` gains `'timeline'`.
- `core/lib/utils/team-tasks-view-storage.ts`: the stored layout keeps `board` and `timeline` (a list is what a view
  without a layout is, so nothing else changes for views saved before).
- `core/hooks/tasks/use-team-tasks-view.ts`: a board or a timeline shows the view's tasks ungrouped (grouping `none`,
  nothing collapsed); `setLayout` writes down every layout but the list.
- `core/lib/utils/team-tasks-timeline.ts` (pure, tested): stored dates → reader's calendar days (a bare date and
  midnight UTC name a day; any other moment is the reader's day of it), the bars (start/end day offsets, due-only,
  start-only, invalid range, overdue, clipped), the unscheduled tasks, today's offset, the header ticks. Day numbers
  come from `Date.UTC` of the local date parts, so a daylight-saving change never makes a day 23 or 25 hours.
- `core/components/pages/teams/team/tasks/list/team-tasks-timeline.tsx`: the layout. A scroll area with a sticky
  header (labels) and a sticky title column; week/month lines and today's line behind the rows; bars as buttons; the
  unscheduled list under it. Day widths 36 px (Weeks) and 10 px (Months).
- `team-tasks-list.tsx` picks the layout; `team-tasks-display-menu.tsx` lists it.
- Strings `pages.teamTasks.LAYOUT_TIMELINE`, `TIMELINE_*` in 13 locales.

## Tests

- `team-tasks-timeline.test.ts`: day reading in four zones, whole days across a DST change, bars and unscheduled tasks,
  overdue rules, invalid range, empty view, the cap and clipping, header ticks.
- `team-tasks-timeline.test.tsx`: bars and labels, the unscheduled list, opening a task from a bar and from the list,
  a done task never overdue, the zoom's pressed state, the empty view.
- `team-tasks-view-layout.test.ts`: the stored timeline is kept, an unknown layout reads as the list.

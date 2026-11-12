# Feature Specification: Tasks — timeline layout of a view

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `tasks-timeline`
**Branch**: `feat/task-timeline`
**Status**: `In Progress`
**Created**: 2026-11-11
**Last updated**: 2026-11-11
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_TASK_VIEWS_ENABLED` (default off), the flag of saved views and their layouts
**Platform API dependency**: none beyond the task fields `startDate` and `dueDate` and saved views
(`tasks-keyboard-and-views`)

---

## 1. Overview

A view of the team's tasks can already be shown as rows (List) or as one lane per status (Board). Some work is
better read against the calendar: what runs this week, what overlaps, what is late. The **Timeline** layout shows the
tasks of the view, with its filters, scope, search and ordering, one row each, as a bar from the task's start date to
its due date on a calendar of days, with today marked. The tasks that have neither date are listed under the
calendar, so nothing of the view is hidden.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** a view with the saved-views feature on, **when** a person picks Display → Layout → Timeline, **then** the
  tasks of the view show as bars on a calendar that opens on today, and a saved view keeps that layout.
- **Given** a task that starts on 10 Nov and is due on 14 Nov, **when** the timeline shows it, **then** its bar covers
  those five days, and its label reads the title and "Nov 10 – Nov 14".
- **Given** a task with a due date only, **when** shown, **then** it is a one-day bar on its due date, marked as such;
  a task with a start date only is a one-day bar on its start, marked as such.
- **Given** an open task whose due date has passed, **when** shown, **then** its bar is marked overdue; a done task is
  never overdue.
- **Given** tasks with neither date, **when** the timeline shows the view, **then** they are listed under the calendar
  ("Without dates (n)"), each opening its task.
- **Given** a bar or a title, **when** the person clicks it (or focuses it and presses Enter), **then** the task opens,
  as it does from a row.
- **Given** the calendar, **when** the person switches the zoom between Weeks and Months, **then** the days narrow or
  widen and the calendar scrolls back to today.

### 2.2 Edge cases & failures

- **Given** a due date before the start date, **when** shown, **then** the task is a one-day bar at its start, marked
  "due before it starts".
- **Given** a due date stored as a day (`2026-11-20`, or midnight UTC), **when** read in any time zone, **then** the bar
  falls on that day (never the day before west of UTC).
- **Given** a task dated years away, **when** shown, **then** the calendar stays at most about three years wide around
  today and the bar is cut at the edge rather than stretching the page.
- **Given** a view with no tasks, **when** the timeline shows it, **then** it says so.
- **Given** the saved-views feature off, **when** a view stored with the timeline layout is opened, **then** it shows as
  a list, as every layout does with the feature off.

## 3. Requirements

- **FR-1** Layout Timeline beside List and Board in Display → Layout; stored in the view's display options like Board;
  any unknown stored layout reads as List.
- **FR-2** One row per task of the view, in the view's ordering, ungrouped (as the board shows its tasks).
- **FR-3** A bar from the start date to the due date, both days included; one day for a due date only, a start date
  only, or a due date before the start; each case marked in the bar's accessible label.
- **FR-4** Overdue: due before today and not done (by the status's `isDone` flag, else the seeded done names).
- **FR-5** Tasks with neither date listed under the calendar, in the view's order.
- **FR-6** Zoom Weeks (days labelled, Mondays marked) and Months (the 1st of each month labelled); the calendar opens on
  today, padded around the earliest and latest dates, at most 3 × 366 days.
- **FR-7** Keyboard and screen reader: every bar and title is a button with a full label (title, dates, notes); the zoom
  buttons expose their pressed state.
- **FR-8** Strings in all 13 locales.

## 4. Out of scope (later)

- Dragging a bar to change dates, dependencies between tasks, grouping rows by assignee or project, and the Angular
  timeline of the platform's web app.

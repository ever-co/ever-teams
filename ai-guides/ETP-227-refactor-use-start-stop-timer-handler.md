# 🚀 [ETP-227] Refactor useStartStopTimerHandler — Extract Business Logic & "Pay Only for What You Use"

## Description

This PR refactors the `useStartStopTimerHandler` hook to address two critical issues:

- **Untestable business logic**: The start/stop decision tree (~100 lines of nested if/else) was embedded inside a `useCallback`, mixing business logic, UI logic (modals), and persistence logic (localStorage). Impossible to unit test without mocking React + window.
- **Duplicated heavy hook instantiation**: Every consumer already had `useTimerView()` or `useTimer()` (which instantiate the full `useTimerApi` — ~12 Jotai subscriptions, 4 `useMutation`, dozens of `useMemo`/`useCallback`). But `useStartStopTimerHandler` internally called `useTimerActions()`, creating a **second full `useTimerApi` instance per component**. Double subscriptions, double mutations, double derivations.

This refactoring applies the **Policy/Executor pattern** and **dependency injection** to solve both problems with zero breaking changes.

## What Was Changed

### Major Changes

- **New file: `apps/web/core/lib/helpers/timer-policy.ts`**
  - `TimerPolicyState` — Pure input interface (all booleans, no React)
  - `TimerAction` — Discriminated union: `NOOP | STOP_TIMER | START_TIMER | SHOW_MODAL(modal)`
  - `getTimerAction(state)` — Pure function encoding the entire decision tree. 100% testable with Jest, zero dependencies.
  - `hasSeenModalToday(key, date)` — Pure localStorage date-check helper

- **Refactored: `apps/web/core/hooks/activities/use-start-stop-timer-handler.ts`**
  - Replaced `useTimerActions()` (heavy, full API layer) with `useTimerPlanStatus()` (lightweight, read-only atoms)
  - Reads `timerStatusFetchingState` directly from the shared Jotai atom
  - Receives `startTimer`/`stopTimer` via **dependency injection** (`UseStartStopTimerHandlerParams`)
  - Hook is now a pure "Executor": builds state → calls policy → switches on action

### Minor Changes

- **`apps/web/core/components/timer/timer.tsx`** — Pass `{ startTimer, stopTimer }` from `useTimerView()` to the handler (both `Timer` and `MinTimerFrame` components)
- **`apps/web/core/components/timer/timer-card.tsx`** — Added `stopTimer` to `useTimer()` destructuring, pass both to handler
- **`apps/web/core/hooks/tasks/use-timer-button.ts`** — Pass `{ startTimer, stopTimer }` from `useTimerView()` to the handler

## How to Test This PR

1. Run the app with `yarn web:dev`
2. Open the browser at `http://localhost:3030`
3. Test the following timer scenarios:
   - Start/stop timer from the **main timer bar** (top of page)
   - Start/stop timer from the **mini timer frame** (collapsed view)
   - Start/stop timer from the **timer card** (widget)
   - Start/stop timer from a **task card** (play button on individual tasks)
4. Verify daily plan enforcement still works:
   - With `requirePlanToTrack` enabled on the team, try starting without a plan → should show enforce modal
   - With a plan but unestimated tasks → should show estimation modal
   - With all conditions met → timer should start normally
5. Verify modals appear correctly:
   - Suggest Daily Plan modal (first time today, no plan)
   - Tasks Estimation Hours modal (tasks not estimated)
   - Enforce Planned Task modal (hard block, task not in plan)
   - Enforce Planned Task Soft modal (soft prompt)
6. Run TypeScript check: `npx tsc --noEmit` → should pass with 0 errors

## Screenshots (if needed)

> No UI changes — this is a pure internal refactoring. All components render identically.

## Related Issues

- Closes [ETP-227](https://evertech.atlassian.net/browse/ETP-227)
- Follows the same refactoring pattern as ETP-223, ETP-224, ETP-225, ETP-226

## Type of Change

- [ ] Bug fix (fixes a problem)
- [x] New feature (adds functionality)
- [ ] Breaking change (requires changes elsewhere)
- [ ] Documentation update

## ✅ Checklist

- [x] My code follows the project coding style
- [x] I reviewed my own code and added comments where needed
- [x] I tested my changes locally
- [x] I updated or created related documentation if needed
- [x] No new warnings or errors are introduced

## Notes for the Reviewer (Optional)

- **Zero breaking change**: The return type of `useStartStopTimerHandler` is identical (`{ modals, startStopTimerHandler }`). Only the call signature changed (now requires `{ startTimer, stopTimer }` params).
- **Performance gain**: Each consumer previously instantiated `useTimerApi` twice (once via their own timer hook, once via the handler). Now it's once — the handler reuses the caller's functions via DI.
- **`getTimerAction()` is a pure function** — trivial to add unit tests. The decision tree is a 1:1 transcription of the original nested if/else.
- **`useTimerActions` is NOT deleted** — it's still exported and available for other hooks that may need it. We just stopped importing it here.
- The `hasSeenModalToday` helper was moved from the hook into `timer-policy.ts` to centralize all pure timer logic.

## ⚠️⚠️⚠️ Reviewers Suggested

- `@evereq` for architecture validation
- `@ndekocode` for integration review
- `@Innocent-Akim` for auth and cookie handling and assistance


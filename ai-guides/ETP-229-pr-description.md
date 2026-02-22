# [ETP-229] Refactor `useTeamMemberCard` — Extract granular hooks & migrate all consumers

## Description

`useTeamMemberCard` was a 298-line monolithic hook that handled identity, task selection, mutations, and role actions all at once. Every team member card/block/table row created its own instance, subscribing to **all** Jotai atoms even if the component only needed one or two properties (e.g., just `isAuthUser`).

This PR splits it into 4 focused hooks and migrates every consumer to use only what it needs.

## What Was Changed

### Major Changes

- **4 new granular hooks** extracted into `core/hooks/organizations/teams/`:
  - `useMemberIdentity` — reads active team + user query to provide identity & role info (`isAuthUser`, `isAuthTeamManager`, `member`, etc.)
  - `useMemberActiveTask` — resolves the member's current active task (`TTask | null`)
  - `useTeamMemberMutations` — assign/unassign task mutations only
  - `useTeamMemberRoleActions` — make/unmake manager, remove member mutations only
- **`useTeamMemberCard`** reduced from 298 → 82 lines, now a thin facade composing the 4 hooks above. Marked `@deprecated` with **zero remaining consumers**.
- **All 30+ consumer files migrated** to use only the hooks they actually need. Each component now follows "pay only for what you use" — no more passing 17-property objects when only 2-3 are read.
- **Lightweight prop types** introduced where components previously accepted `I_TeamMemberCardHook` (the full 17+ property type):
  - `TaskEstimateInfo` / `TaskEstimateInput` → `TaskEstimateMemberInfo` (3 props: `memberTask`, `isAuthUser`, `isAuthTeamManager`)
  - `TaskTimes` / `TodayWorkedTime` → `TaskTimesMemberInfo` (2 props: `member`, `id`)
- **Dead prop removed**: `TaskProgressBar` had a `memberInfo` prop in its type that was never read — cleaned up.
- **Shared row context** in `team-member-cells.tsx` redesigned with proper granular types (`I_MemberIdentityHook`, `I_TeamMemberMutationsHook`, etc.) instead of the monolithic `I_TeamMemberCardHook`.

### Minor Changes

- Barrel export updated in `core/hooks/organizations/index.ts` for the 4 new hooks + their types
- `UserTeamCardMenu` now receives granular props (`identity`, `memberTask`, `mutations`, `roleActions`, `edition`) instead of a single `memberInfo` blob
- `useMemo` wrappers added where lightweight objects are composed from hook values, to avoid unnecessary re-renders
- Removed unused `I_TeamMemberCardHook` and `IEmployee` imports across all migrated files

## How to Test This PR

1. Run the app with `yarn web:dev`
2. Open the browser at `http://localhost:3030`
3. Navigate to a team page and verify:
   - **Team member cards** (card view) render correctly with task info, times, and estimates
   - **Team member blocks** (block view) render correctly
   - **Team member table** (table view) renders correctly — task cells, estimate cells, time cells, action menus
4. Test interactive features:
   - Click the 3-dot menu on a member card → **Assign/Unassign task** works
   - Click the 3-dot menu → **Make/Unmake manager** works
   - Click the 3-dot menu → **Remove member** works
   - Click the 3-dot menu → **Edit task** triggers edit mode in the task cell
   - Task estimate editing works on cards, blocks, and table rows
5. Navigate to **All Teams** page → verify member cards and blocks render correctly there too
6. Open a **Daily Plan** → verify the compare estimate modal works
7. Open a **Kanban board** → verify kanban card menus work
8. Run `npx tsc --noEmit` — should pass with **zero errors**

> No UI changes — this is a pure refactoring PR. Everything should look and behave exactly the same.

## Screenshots (if needed)

No visual changes. This is an internal refactoring with no UI impact.

## Related Issues

- Closes ETP-229
- Follows the same pattern as ETP-225 (`useReportActivity`), ETP-226 (`useKanban`), ETP-227 (`useStartStopTimerHandler`)

## Type of Change

- [ ] Bug fix (fixes a problem)
- [ ] New feature (adds functionality)
- [x] Refactoring (no functional change, improves code structure and performance)
- [ ] Breaking change (requires changes elsewhere)
- [ ] Documentation update

## ✅ Checklist

- [x] My code follows the project coding style
- [x] I reviewed my own code and added comments where needed
- [x] I tested my changes locally
- [x] I updated or created related documentation if needed
- [x] No new warnings or errors are introduced
- [x] `npx tsc --noEmit` passes with zero errors

## Notes for the Reviewer

- **No functional changes** — every component should behave exactly as before. The only difference is internal: which hooks are called and how props are passed.
- **Structural typing** made this migration safe: changing a child's prop type from `I_TeamMemberCardHook` (superset) to a lighter type (subset) doesn't break any caller that still passes the full object.
- `useTeamMemberCard` is kept as a `@deprecated` facade for now. It can be fully removed in a future cleanup once the team confirms no external consumers exist.
- The `useTMCardTaskEdit` hook was intentionally left in `use-team-member-card.ts` — it's a separate concern (task edition state) that doesn't belong in any of the 4 new hooks.

## ⚠️⚠️⚠️ Reviewers Suggested

- `@evereq` for architecture validation
- `@Innocent-Akim` for integration review


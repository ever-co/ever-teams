# 🚀 Pull Request Title

Fix daily plans popup consistency and "See Plans" behavior (ETP-92, ETP-162)

## Description

This PR fixes two related daily plans issues:

- The **Plans popup** (Home / Team → member card → menu → "See Plans") was not showing the same data as the **Profile → Plans** tab for the same member.
- The **"See Plans" action** and daily plan mutations were incorrectly using the **connected user’s employeeId** instead of the **selected member’s employeeId**, especially for managers editing other employees’ plans.

To address this, we:

- **Align the daily plans modal with the selected member** by correctly propagating `employeeId` from the team member card into the global `AllPlansModal` and daily plan hooks/services.
- **Restore proper daily-plan mutation payloads** (`employeeId`, `organizationId`) so they match Ever-Gauzy backend expectations, instead of relying on the previous workaround.
- **Add a clear read-only mode** for daily plans when the viewer is not allowed to edit (non-admin / non-manager on another employee’s data).

These changes make the daily plans experience more predictable and aligned with backend rules.

## What Was Changed

### Major Changes

- Ensure the **Plans popup opened from a member card** uses the **selected member’s `employeeId`** end-to-end (store, `AllPlansModal`, daily plan hooks, mutations).
  - Result: the data shown in **Home → member card → "See Plans"** matches the **Profile → Plans** tab for the same member (ETP-92, ETP-162).
- Simplify daily-plans client state: remove legacy per-user global daily-plan stores and keep a single team-wide atom (`dailyPlanListState`), while per-employee plans are derived from React Query in `useDailyPlan` to avoid desynced views.
- Reintroduce **`employeeId` and `organizationId`** in all daily-plan mutation payloads (`create`, `addTaskToPlan`, `removeTaskFromPlan`, unplan flows), so the frontend matches the Ever-Gauzy daily plan API contract instead of depending on the previous "no employeeId / no organizationId" workaround.
- Implement **role-based edit permissions** in `AllPlansModal`:
  - Only **Admin / Super Admin / Manager / plan owner (connected user on their own plans)** can create, update, or delete daily plans.
  - All other viewers see a **read-only daily plans modal** (buttons disabled, handlers short-circuited before calling mutations).

### Minor Changes

- Make daily plan unplan actions safer by avoiding sending `null` employee IDs (use `plan.employeeId ?? undefined`) and aligning some layout classes for the unplan modal.
- Add a small inline comment near daily-plan mutations to document the current Ever-Gauzy limitation (backend uses `employeeId` + `organizationId` in WHERE filters), so the current behavior is easier to understand for future maintainers.

## How to Test This PR

> All tests are manual for now.

1. **Run the web app**
   - `yarn web:dev`
   - Open `http://localhost:3030`

2. **Verify ETP-92: Plans popup vs Profile → Plans**
   1. Go to the **Home / Teams** page and locate a member card.
   2. Open the **actions menu** on that member card and click **"See Plans"** (or equivalent).
   3. Note the list of daily plans and tasks shown in the modal.
   4. Open the **Profile page** for the same member and go to the **"Plans"** tab.
   5. ✅ Confirm: the **plans and tasks** in the popup match the ones in **Profile → Plans** for that member (same counts, same content).

3. **Verify ETP-162: "See Plans" uses the selected member’s plans**
   1. Log in as a user who is part of a team.
   2. On the **team members list**, pick a team member who is **not** the connected user.
   3. Click **"See Plans"** on that member.
   4. ✅ Confirm: the modal shows **that member’s** daily plans, not your own.
   5. As a **manager** (or admin), try to **create a new daily plan** for that member from their card.
   6. ✅ Confirm: the new plan is created **under the selected member’s profile**, not under the connected user.

4. **Verify read-only behavior for non-privileged users**
   1. Log in as a **non-admin / non-manager** user.
   2. Open **"See Plans"** for a **different employee**.
   3. ✅ Confirm:
      - The modal opens and shows the other employee’s plans.
      - **Create / Add task / Unplan** actions are visually disabled and do not trigger mutations.
   4. Open your **own** plans (no `employeeId` override).
   5. ✅ Confirm: you can still create, update, and unplan your own daily plans normally.

## Screenshots (if needed)

| Before           | After            |
| ---------------- | ---------------- |
| (Add screenshot) | (Add screenshot) |

### Previous screenshots

Please add here videos or images of the previous status

### Current screenshots

Please add here videos or images of the current (new) status

## Related Issues

- ETP-92 – FixBug: Plans popup shows different data than Profile → Plans tab
- ETP-162 – [Web] "See Plans" menu shows connected user’s daily plans instead of selected member’s plans

## Type of Change

- [x] Bug fix (fixes a problem)
- [ ] New feature (adds functionality)
- [ ] Breaking change (requires changes elsewhere)
- [ ] Documentation update

## ✅ Checklist

- [x] My code follows the project coding style
- [x] I reviewed my own code and added comments where needed
- [x] I tested my changes locally
- [x] I updated or created related documentation if needed
- [x] No new warnings or errors are introduced

## Notes for the Reviewer (Optional)

- The daily plans behavior is still constrained by Ever-Gauzy backend rules: cross-employee operations depend on how the API injects `employeeId` into queries. This PR keeps the frontend aligned with the current behavior and avoids sending inconsistent payloads.
- If backend changes how daily plan permissions work (e.g., new manager capabilities), we can further simplify some of the UI conditions and remove workarounds.

## ⚠️⚠️⚠️ Reviewers Suggested

- `@evereq` for architecture validation
- `@ndekocode` for integration review
- `@Innocent-Akim` for auth and cookie handling and assistance
- `@AnicetFantomas` and `@Sergemuhundu` for mobile app and some web issues
- `@Cedric921` and `@GloireMutaliko21` for complex issues

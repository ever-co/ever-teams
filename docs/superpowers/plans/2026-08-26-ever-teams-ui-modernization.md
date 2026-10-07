<!-- markdownlint-disable MD010 MD013 MD032 MD043 -->

# Ever Teams UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a professional, compact, permanently full-width Ever Teams UI with one-scroll layouts, working My Work navigation, compact date selection, complete chat controls/history, and a reachable table below the expanded dashboard chart.

**Architecture:** Make full width and one-scroll ownership structural in the shared shell, then apply compact semantic recipes to the named surfaces and high-use pages. Keep all domain behavior in existing hooks/services; UI components only change layout, navigation, and browser-local chat presentation state.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind CSS 4, Radix/shadcn-style components, Jotai, React Day Picker, Recharts, AI SDK, Jest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-26-ever-teams-ui-modernization-design.md`

## Global Constraints

- Full width is the only supported web layout; remove the user switch and obsolete preference path.
- Preserve every existing Ever Teams feature except the explicitly retired Full Width switch.
- Use existing dependencies; do not add a UI library or backend endpoint.
- One vertical page scroll owner; wide tables may retain local horizontal scrolling.
- Keep the timer, Ever Teams identity, reporting colors, and current business/data behavior.
- Do not modify `apps/mobile/app.json` in the primary checkout.
- Deploy only to `develop`; stage and production require later explicit approval.

---

### Task 1: Permanent full-width shell and density recipes

**Files:**

- Create: `apps/web/core/components/common/container.test.tsx`
- Modify: `apps/web/styles/globals.css`
- Modify: `apps/web/core/components/common/container.tsx`
- Modify: `apps/web/core/components/users/user-nav-menu.tsx`
- Modify: `apps/web/core/components/common/toggler.tsx`
- Modify: `apps/web/core/stores/common/full-width.ts`
- Modify: all web callers of `fullWidthState`, `fullWidth`, and `conf-fullWidth-mode`

**Interfaces:**

- Produces: fluid `Container({ children, className })` and semantic CSS recipes `.app-page`, `.app-page-header`, `.app-surface`, `.app-section`, `.app-field`, `.app-label`, `.app-help`.
- Removes: `FullWidthToggler`, `fullWidthState`, and `conf-fullWidth-mode` from web runtime code.

- [ ] **Step 1: Write the failing container behavior test**

```ts
/** @jest-environment jsdom */
test('renders every page container as a fluid padded region', () => {
	render(<Container data-testid="container">Content</Container>);
	const container = screen.getByTestId('container');
	expect(container).toHaveClass('w-full', 'px-4');
	expect(container).not.toHaveClass('x-container');
});
```

- [ ] **Step 2: Run `yarn workspace @ever-teams/web test core/components/common/container.test.tsx --runInBand` and verify it fails because the current container still depends on the `fullWidth` prop.**
- [ ] **Step 3: Add the compact semantic recipes, simplify `Container` to responsive fluid padding, remove the profile switch/persistence/state, and migrate every web caller to the structural full-width API.**
- [ ] **Step 4: Run the focused test plus `yarn workspace @ever-teams/web test --runInBand`; expect all tests to pass.**
- [ ] **Step 5: Commit with `refactor(web): make application layout permanently full width`.**

### Task 2: One-scroll `PageLayout`

**Files:**

- Create: `apps/web/core/components/layouts/default-layout/page-content-scroller.tsx`
- Create: `apps/web/core/components/layouts/default-layout/page-content-scroller.test.tsx`
- Modify: `apps/web/core/components/layouts/default-layout/page-layout.tsx`
- Modify: `apps/web/core/components/layouts/default-layout/global-header.tsx`
- Modify: `apps/web/core/components/layouts/default-layout/layout-shell.tsx`
- Modify: page callers that set viewport heights or vertical `overflow-y-auto`

**Interfaces:**

- Produces: `PageContentScroller({ children, className, contentClassName, footer, footerFixed })` as the sole `data-page-scroll-owner` and `PageLayout` as a normal `min-h-0 flex flex-col` page.
- Preserves: `showTimer`, `mainHeaderSlot`, footer sizing, title updates, and public-team behavior.

- [ ] **Step 1: Write a jsdom test rendering `PageContentScroller` with tall children and asserting exactly one vertical scroll owner, normal child flow, and sticky footer behavior when `footerFixed` is enabled.**
- [ ] **Step 2: Run the focused test and verify failure because `PageContentScroller` does not exist.**
- [ ] **Step 3: Replace the vertical panel/offset structure with a flex header plus one overflow-y content region; retain horizontal overflow only in table wrappers.**
- [ ] **Step 4: Run shell/layout tests and the full web suite.**
- [ ] **Step 5: Commit with `refactor(web): establish one-scroll page shell`.**

### Task 3: Professional Settings layout and compact forms

**Files:**

- Create: `apps/web/core/components/pages/settings/settings-navigation.tsx`
- Create: `apps/web/core/components/pages/settings/settings-navigation.test.tsx`
- Modify: `apps/web/app/[locale]/(main)/settings/layout.tsx`
- Modify: `apps/web/app/[locale]/(main)/settings/personal/page.tsx`
- Modify: `apps/web/app/[locale]/(main)/settings/team/page.tsx`
- Modify: `apps/web/core/components/pages/settings/left-side-setting-menu.tsx`
- Modify: personal/team Settings section components and Settings skeletons
- Delete only after callers are migrated: `apps/web/core/components/layouts/sidebar-accordian.tsx`

**Interfaces:**

- Produces: `SettingsNavigation` with route groups, anchor links, pathname-derived route state, and active-section state.
- Consumes: existing `useLeftSettingData`, manager permissions, and current setting-section atoms.

- [ ] **Step 1: Write a jsdom test that renders the navigation and asserts Personal/Team links, active styling, all existing section anchors, and a distinct danger entry.**
- [ ] **Step 2: Run the test and verify it fails before `SettingsNavigation` exists.**
- [ ] **Step 3: Build the flat sticky desktop navigation and mobile tab row, then make Settings content use normal document flow with `.app-surface` sections.**
- [ ] **Step 4: Replace 54px controls, 18px field labels, and oversized section padding with 36-40px controls, 14px labels, and 16-24px section padding without changing handlers or data hooks.**
- [ ] **Step 5: Run Settings tests, full unit suite, and lint.**
- [ ] **Step 6: Commit with `feat(settings): modernize layout and control density`.**

### Task 4: My Work navigation and compact date-range picker

**Files:**

- Create: `apps/web/core/components/layouts/my-work-navigation.ts`
- Create: `apps/web/core/components/layouts/my-work-navigation.test.ts`
- Modify: `apps/web/core/components/layouts/app-sidebar.tsx`
- Modify: `apps/web/core/components/layouts/nav-main.tsx`
- Modify: `apps/web/core/components/common/calendar.tsx`
- Modify: `apps/web/core/components/pages/time-and-activity/date-range-picker-time-activity.tsx`
- Create: `apps/web/core/components/common/calendar.test.tsx`
- Create: `apps/web/core/components/pages/time-and-activity/date-range-picker-time-activity.test.tsx`

**Interfaces:**

- Produces: `getMyWorkNavigation(userId?: string, userName?: string): { timeAndActivity: string; workDiary: string }`.
- Produces: compact two-month `Calendar` styling while retaining the existing DayPicker props contract.

- [ ] **Step 1: Write tests asserting `/reports/time-and-activity` and `/reports/timesheet/<encoded-id>?name=<encoded-name>` and asserting pathname-derived active submenu behavior.**
- [ ] **Step 2: Run the navigation tests and verify the current `href="#"` behavior fails.**
- [ ] **Step 3: Implement real destinations and route-derived active states, preserving expandable sidebar groups.**
- [ ] **Step 4: Write calendar/picker render tests that open the real popover, assert two month grids and preset actions remain present, and assert day buttons/preset buttons meet the compact 30-32px/32px rendered-size contract.**
- [ ] **Step 5: Reduce day cells, captions, gaps, preset buttons, and footer actions; add narrow-width overflow/wrapping behavior.**
- [ ] **Step 6: Run focused tests and commit with `fix(web): restore My Work routes and compact date picker`.**

### Task 5: Complete AI chat panel controls and browser-local history

**Files:**

- Create: `apps/web/core/components/features/chat-panel/services/chat-history.storage.ts`
- Create: `apps/web/core/components/features/chat-panel/services/chat-history.storage.test.ts`
- Create: `apps/web/core/components/features/chat-panel/components/chat-toolbar.tsx`
- Create: `apps/web/core/components/features/chat-panel/components/chat-history.tsx`
- Create: `apps/web/core/components/features/chat-panel/components/chat-panel-controls.tsx`
- Modify: `apps/web/core/components/features/chat-panel/components/chat-panel-layout.tsx`
- Modify: `apps/web/core/components/features/chat-panel/components/chat-view.tsx`
- Modify: `apps/web/core/components/features/chat-panel/hooks/use-chat-panel.ts`
- Modify: chat-panel atom/constants and locale files
- Create: `apps/web/core/components/features/chat-panel/components/chat-panel-controls.test.tsx`

**Interfaces:**

- Produces: `ChatSession { id: string; title: string; updatedAt: number; messages: ChatHistoryMessage[] }`.
- Produces: scoped `readChatHistory`, `writeChatHistory`, `upsertChatSession`, and `clearChatHistoryForUser` with malformed-storage fallback.
- Produces: launcher, collapse, expand/restore, drag resize, New Chat, and History controls.

- [ ] **Step 1: Write pure storage tests for empty, malformed, save/update, delete, clear, ordering, and bounded history behavior.**
- [ ] **Step 2: Run the storage tests and verify failure before the service exists.**
- [ ] **Step 3: Implement local storage using a versioned user/workspace/team-scoped key and safe JSON validation; cap history to 50 conversations and clear the current user's scoped records on logout.**
- [ ] **Step 4: Write a component test for the real launcher/control rail that asserts accessible open, collapse, resize, and expand/restore controls; watch it fail before the components exist.**
- [ ] **Step 5: Build the Bot launcher on the sidebar boundary, the open-panel control rail, toolbar, and history view; persist clamped width/open state and provide a mobile close overlay.**
- [ ] **Step 6: Add translated accessible labels for every new control and wire AI SDK messages to New Chat/history selection without changing `/api/chat`.**
- [ ] **Step 7: Run chat tests and full suite; commit with `feat(chat): add professional panel controls and history`.**

### Task 6: Expanded team chart in normal page flow

**Files:**

- Create: `apps/web/core/components/pages/dashboard/team-dashboard/team-dashboard-activity-section.tsx`
- Create: `apps/web/core/components/pages/dashboard/team-dashboard/team-dashboard-activity-section.test.tsx`
- Modify: `apps/web/app/[locale]/(main)/dashboard/team-dashboard/[teamId]/page.tsx`
- Modify: `apps/web/core/components/pages/dashboard/team-dashboard/team-stats-chart.tsx`

**Interfaces:**

- Produces: `TeamDashboardActivitySection({ showChart, onToggleChart, chart, table })`, which renders an optional chart before a table in normal document flow.

- [ ] **Step 1: Write a jsdom test for `TeamDashboardActivitySection` that expands the chart, asserts chart-before-table DOM order, and confirms both remain descendants of the page scroll owner.**
- [ ] **Step 2: Run the test and verify failure because the flow component does not exist.**
- [ ] **Step 3: Move the chart toggle/card into the page content above the table, keeping `showChart`, grouping, line visibility, loading, and collapse behavior unchanged.**
- [ ] **Step 4: Compact chart padding/control sizing and ensure the chart wrapper has intrinsic height rather than viewport height.**
- [ ] **Step 5: Run focused/full tests and commit with `fix(dashboard): keep expanded chart and table scrollable`.**

### Task 7: High-use page consistency sweep

**Files:**

- Modify: dashboard, project, task, profile, timesheet, Time & Activity, calendar, sidebar, header, footer, and related skeleton components that contain oversized or conflicting layout classes
- Create: `apps/web/core/components/common/app-surface-contract.test.tsx`

**Interfaces:**

- Consumes: `.app-page`, `.app-page-header`, `.app-surface`, `.app-section`, `.app-field`, `.app-label`, `.app-help`.
- Produces: consistent high-use surface density without changing data or event contracts.

- [ ] **Step 1: Add a render contract test for representative Settings, date, dashboard, and sidebar controls that asserts 36-40px interactive heights, compact heading hierarchy, and a single vertical scroll owner.**
- [ ] **Step 2: Run it and record the failing rendered dimensions/ownership assertions.**
- [ ] **Step 3: Migrate the named high-use files to shared recipes, preserving timer dimensions and deliberate table/chart visualization sizes.**
- [ ] **Step 4: Run formatter, focused tests, full tests, lint, and the production web build.**
- [ ] **Step 5: Commit with `style(web): normalize high-use application surfaces`.**

### Task 8: Browser verification, review, merge, and develop deployment

**Files:**

- Modify only if verification finds a reproducible defect: the owning component plus its regression test
- External coordination: `E:\Coding\_LOCAL\MAINTENANCE.md`

**Interfaces:**

- Produces: reviewed PR merged to `develop` and exact-SHA deployment evidence for `ever-teams-dev`.

- [ ] **Step 1: Run `yarn workspace @ever-teams/web test --runInBand`, `yarn workspace @ever-teams/web lint`, and `yarn workspace @ever-teams/web build`; require zero failures.**
- [ ] **Step 2: Start the production build locally and verify desktop/mobile light/dark flows for Settings, My Work routes, date picker, chat controls/history, and expanded chart/table scrolling.**
- [ ] **Step 3: Push the branch, open a PR, inspect every required check and bot/AI review thread, and fix actionable findings with regression tests.**
- [ ] **Step 4: Immediately before merge/deployment, pull the shared maintenance board, verify no conflicting active claim, append/push an Ever Teams develop claim, and recheck the target state.**
- [ ] **Step 5: Merge only with green required checks; verify the exact develop merge SHA and resulting image build.**
- [ ] **Step 6: Verify Argo `Synced/Healthy`, exact image digest/SHA, ready pods with zero restarts, HTTP health, browser flows, and console/network behavior on `demo.ever.team`.**
- [ ] **Step 7: Move the maintenance claim to the change log with data impact (`none`), verification evidence, and rollback SHA; do not promote stage or production.**

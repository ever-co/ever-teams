import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { BrowserContext, Page, Route } from '@playwright/test';

import { expect, test, type BootstrapFixture, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit, waitForShellReady } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really is asked for on the **home page** (`/`,
 * `app/[locale]/page.tsx` → `app/[locale]/page-component.tsx`), on lane-a (app `http://localhost:3031`, mock
 * `http://127.0.0.1:3992`, stats sink `3993`, control `3994`, issuer `3995`, `playwright/test-servers.ts:38`).
 *
 * ## Where the numbers came from
 *
 * Every asserted value comes from a printed line: the throwaway probes `D:\Coding\.tmp\probe-home\probe1.spec.disabled`
 * (`/d/Coding/.tmp/probe-home-run-1.log`), `probe2.spec.ts` (`-run-2.log`), `probe3.spec.ts` (`-run-3.log`),
 * `probe5.spec.ts` (`-run-5.log`) — all run on this lane on 2026-11-27 inside the lane-a lock — plus this file's own
 * `MEASURE` lines from its measurement runs (`/d/Coding/.tmp/s3-lane-a-home-0.log`, `-0b.log`, `-0c.log`, `-0d.log` and
 * `-0e.log`, each one the whole file, each with the values it pinned printed as it asserted them) and from the two
 * acceptance runs (`s3-lane-a-home-1.log`, `s3-lane-a-home-2.log`). A probe case that failed is never quoted as a
 * measurement: probe 3's
 * served team carried malformed member ids (`…70000000002`, eleven hex digits) and probe 4's served members never
 * validated, so `probe-home-run-3.log` and `-4c.log` are cited only for the console lines and the DOM text they printed.
 * `E2E_REUSE_SERVERS=1` is how the lane is started for this suite; this file itself starts no server.
 *
 * ## Which layer is real and which is served
 *
 * **Real (the lane's own mock, `cypress/support/mock-gauzy-server.mjs`):** tests 1 and 3 run with no stub at all, on the
 * mock's own bootstrap fixture — one team with three members (`:216-225`), one task, one project,
 * `GET /api/organization-team` → `pagination([team])` and `GET /api/organization-team/<id>` → the team,
 * `GET /api/invite/me` → one invitation with no `teams` (`:1105-1110`), `GET /api/daily-plan/employee/<id>` → one plan
 * dated today, `POST /api/auth/refresh-token` and `POST /api/auth/switch-organization`. The NextAuth session stub and the
 * app's own shell are the lane's, as in every lane-a file. Tests 5 and 6 also run on the mock's answers for the
 * *session* half of an accept, because those two paths are the mock's own handlers.
 *
 * **Served by this file (`page.route` on the mock origin, never `route.fetch()`):** the team read with members whose
 * timer status this lane's mock cannot express (test 2), the worked-logs read that goes with it, every invitation and
 * every invitation answer (tests 4-8), the daily plans a past day implies (test 9), and the user-without-a-member-profile
 * plus the empty team list (test 10). The mock cannot serve those: no member it answers carries a `timerStatus` (its
 * employees carry `isTrackingTime: false` and no `isOnline`, `mock-gauzy-server.mjs:138-147`), it answers
 * `/api/invite/<id>/<action>` with the body it was sent (`:893-896`), its one plan is always dated today, and its one
 * person always has an employee. Every served answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`) because the page sits on `localhost:3031` and the
 * API on `127.0.0.1:3992`, and answers `OPTIONS` with 204. In every stubbed test `mock.calls(<that path>)` is empty,
 * which is the witness that the page acted on this file and not on the mock. Served ids and names are this file's own
 * (`Served …`), except the fixture person, who is served as the team's own member.
 *
 * **The browser talks to the mock, never to the app's own route twins.** Measured in `probe-home-run-1.log` P1: the mock
 * logged 27 reads for the home load, the browser made exactly those 27 against `http://127.0.0.1:3992`, and the only
 * origins touched were `http://localhost:3031` and `http://127.0.0.1:3992`. Test 1 pins that comparison, sorted on both
 * sides. `app/api/**` proxies are not in this file's path (they are pinned by `suites/api`).
 *
 * ## What the Chatwoot widget, and Web Analytics, do on this lane
 *
 * `app/[locale]/page-component.tsx:170` renders `<LazyChatwootWidget />` on every home load, and
 * `core/components/integration/chatwoot/index.tsx:13-17` returns **before** injecting any script while
 * `CHATWOOT_API_KEY.value` (`NEXT_PUBLIC_CHATWOOT_API_KEY`, `core/constants/config/constants.tsx:299-301`) is empty —
 * which it is on this lane. Measured in `probe-home-run-1.log` P1 and pinned in test 1: this file's guard aborted
 * **nothing**, and the origins seen were exactly the app and the mock — so `https://app.chatwoot.com/packs/js/sdk.js` was
 * never asked for, and no Chatwoot iframe, bubble or button exists on the page. Test 1 pins the other gate too
 * (`page-component.tsx:186-188`): with no `NEXT_PUBLIC_VERCEL_ENV` and no `VERCEL` on the lane, `<Analytics />` is not
 * rendered and no `/_vercel/insights/…` request was made.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `app/[locale]/page-component.tsx`: `:60-72` the reads and the two switches (`useUserQuery`,
 *   `useEmployeeDailyPlans(employeeId)`, `organizationTeamsState`,
 *   `showsTeamParts = !isInNoTeamForLackOfMemberProfile(user, teams.length)`, `showsTeamWork = isTeamMember &&
 *   showsTeamParts`, `useIsMemberManager(user)`, `useAsksForEmailVerification`, `useMyInvitationsQuery()`,
 *   `useAtom(headerTabs)`); `:74-77` the breadcrumb (`JSON.parse(t('pages.home.BREADCRUMB'))`, then the team name, then
 *   `t('common.'+view)`); `:79-93` the view effect (Kanban on `/` → `setView(CARDS)`, and a stored
 *   `LAST_SELECTED_TEAM_MEMBERS_VIEW_MODE` restored only when it is a valid `IssuesView` **and not** `KANBAN`);
 *   `:110-115` `TeamLiveSummary` + `<HeaderTabs linkAll={false} />`; `:120-124` `LazyUnverifiedEmail`; `:127-135`
 *   `LazyTeamInvitations` only when `myInvitationsList.length > 0`; `:137-149` `LazyTeamOutstandingNotifications` when
 *   the person has outstanding plans **or** has sorted plans and is the team's manager; `:153-159` `TaskTimerSection`;
 *   `:161-165` `LazyTeamMemberHeader`; `:173-181` `LazyTeamMembers` else `LazyNoTeam`; `:170` the Chatwoot widget;
 *   `:186-188` the Vercel Analytics gate, whose own comment reads "Vercel Web Analytics only exists on Vercel; on the
 *   k8s deployments its /_vercel/insights/script.js 404s on every page view (gate, don't remove — it comes back the
 *   moment the app runs on Vercel)."
 * - `core/components/pages/teams/team/team-live-summary.tsx` `:23-38`: `memberCount = stats.all`,
 *   `workingCount = stats.running`, the `<h1>` is the team name, `pages.home.MEMBER_COUNT` always, and the working-now
 *   span only when `hasWorkingMembers` (`workingCount > 0`).
 * - `core/hooks/teams/use-team-member-filter-stats.ts` `:37-81` counts `getMemberFilterStatus(member)` per member;
 *   `core/lib/utils/team-members.utils.ts:68-85` is where a member becomes `running`:
 *   `isTrackingOutsideTeam` (`core/lib/helpers/team-member-tracking.ts:22-26` — `employee.isOnline &&
 *   employee.isTrackingTime` while the team's own `timerStatus` is not `running`) → `RUNNING`; otherwise
 *   `!!employee.isTrackingTime || member.timerStatus === 'running'` decides only *whether* the member is tracking, and
 *   the returned value is `member.timerStatus ?? undefined`, so `isTrackingTime` **alone** counts as nothing and lands in
 *   `idle` (`use-team-member-filter-stats.ts:44-46`). Nothing in the app ever writes `timerStatus` into a team read, so
 *   test 2 serves it.
 * - `core/hooks/organizations/teams/use-today-seconds-without-team.ts` `:23-45`: `GET /timer/status/worked`
 *   (`core/services/client/api/timers/timer.service.ts:325-332`, `/api/timesheet/timer/status/worked` on this lane) is
 *   enabled only while some member tracks outside the team, and `:46` then calls `statuses?.find(…)`.
 * - `core/components/common/header-tabs.tsx` `:11-16` the four views, `:38-40` `setLastTeamMembersViewMode` (the only
 *   writer of `last-selected-team-members-view-mode`, `core/constants/config/constants.tsx:692`), `:62-72` a Kanban pick
 *   skips both `setView` and the storage write and routes to `/kanban`, `:79` the switch's `aria-label` is
 *   `common.VIEW`; `core/components/common/segmented-control.tsx` `role="tablist"` with `role="tab"`, `aria-label` and
 *   `aria-selected`.
 * - `core/components/duplicated-components/breadcrumb.tsx` `:29-52`: `nav aria-label="breadcrumb"` > `ol > li`, the
 *   separators are `aria-hidden` `li`s, the current crumb carries `aria-current="page"`.
 * - `core/components/teams/team-invitations.tsx` `:42-48` (`removedInvitations` read back from `sessionStorage`),
 *   `:77-84` (that list filters the rows; the question is `CONFIRM_REJECT_INVITATION` or `CONFIRM_ACCEPT_INVITATION`),
 *   `:96-135` one `li` per invitation (`pages.home.INVITATIONS` then `invitation.teams?.[0]?.name` in a `font-semibold`
 *   span, `Accept`, `Reject`, and a ghost button `aria-label={t('common.CLOSE')}`), `:152-219` `ConfirmModal` (`Modal`
 *   with `Text.Heading as="h3"` `:179-181`, `notifyMessage` shown **only** when the mutation resolved with a `message`
 *   `:183` and `:197-208`, then `Discard` `:186-188` and `Confirm` `:190-213`,
 *   `Discard` and `Confirm`). `core/components/common/modal.tsx` is Headless UI `Dialog`, which is why
 *   `getByRole('dialog')` finds it.
 * - `core/hooks/invitations/use-my-invitations-query.ts` `:41-55` (`GET /invite/me`, `staleTime` 2 min, `refetchInterval`
 *   60 000), `:66-80` `removeMyInvitation` (cache only), `:84-87` `refetchMyInvitations`.
 *   `core/hooks/invitations/use-respond-to-invitation.ts` `:39-62`, whose docstring `:19-21` says "On accept:
 *   refreshToken + router.refresh (session update) / On reject: optimistic React Query cache update + cross-cache
 *   invalidation": `:40-42` an answer that carries a `message` returns early and changes nothing, `:44-48` accept
 *   re-reads the session, `:51-60` reject filters the cache and invalidates both invitation queries.
 *   `core/services/client/api/organizations/teams/invites/invite.service.ts` `:52-58` (`GET /invite/me` validated by
 *   `inviteSchema`) and `:96-104` (`PUT /invite/<id>/<ACCEPTED|REJECTED>` when `GAUZY_API_BASE_SERVER_URL` is set, which
 *   it is on this lane).
 * - `core/components/teams/team-outstanding-notifications.tsx`: `:47-52` the member's notice needs outstanding plans,
 *   the manager's needs `isTeamManager && dailyPlan.items?.length > 0`; `:57-113` the member's `Notice` (title
 *   `notifications.NOTICES.OUTSTANDING_TITLE` with the count from `outstandingNoticeTasksOf`
 *   (`core/lib/utils/outstanding-notice.ts:17-23`, unique task ids of past plans), description `OUTSTANDING_TEXT`, a
 *   `Link` to `/profile/<user id>?name=<name>` whose `onClick` calls `onClose` and writes `task-tab=dailyplan` and
 *   `daily-plan-tab=Outstanding`, `dismissLabel` `notifications.NOTICES.DISMISS`); `:115-192` the manager's `Notice`
 *   (plans whose `employeeId` is not the viewer's, due on or before today `:128`, with an unfinished task `:129`,
 *   deduplicated by employee `:138-146`, each named as a link to that member's profile `:174`).
 *   `core/components/common/notice.tsx` renders a `Notice` as an `<output>` with a dismiss `button aria-label`.
 *   `core/hooks/daily-plans/use-daily-plan-calculations.ts:92` the day key is `moment().format('YYYY-MM-DD')`, and
 *   `pastPlansWithIncompleteTasksOf` keeps plans dated before that key that hold an unfinished task not re-planned today
 *   or later.
 * - `core/components/common/no-team.tsx` `:24-49` the ordinary no-team screen (`common.NO_TEAM`, `common.NO_TEAM_SUB`, a
 *   `common.CREATE_TEAM` button) versus `:51-63` `NoMemberProfile`, shown when `hasNoMemberProfile(user)`
 *   (`core/lib/utils/member-profile.ts`) through `AnimatedEmptyState` with `dashboard.calendar.NO_MEMBER_TITLE` and
 *   `common.NO_MEMBER_PROFILE_MESSAGE` and no team-creating button. `app/[locale]/page-component.tsx:66` is the switch
 *   that keeps the whole team half away.
 *
 * ## What the probes measured, per case (the assertions are pinned on these)
 *
 * - **The lane's own home** (P1, `probe-home-run-1.log`): the breadcrumb read `Home`, `Fixture Team A`, `Cards`; the
 *   summary row `Fixture Team A3 members` (three members, **no** working-now span, because no member of the mock's team
 *   carries a `timerStatus` and none has `isTrackingTime`); the switch labelled `View` with `Cards` selected;
 *   `last-selected-team-members-view-mode` empty; console and page errors empty; nothing left the two allowed origins and
 *   nothing was aborted. The two read sides cover the **same 22 `METHOD path` pairs** — but the mock's own log holds 28
 *   entries while the browser made 25, the difference being three extra `GET /api/user/me` the browser never made (the
 *   page's server side reads it too), so test 1 pins the two sides as *sets* and reports both counts.
 * - **Working now** (P8: served fixture person + one member with `timerStatus: "running"` + one with none →
 *   `Fixture Team A3 members1 working now`; probe 5 `B1`/`B2`/`B3`/`B4`: `4 members1 working now`,
 *   `5 members2 working now`, `4 members1 working now` for an outside-team tracker, `4 members` with nothing counting).
 *   probe 5's served members did not reuse the fixture's own user id, so `useProcessedTeamMembers` appended the viewer as
 *   one extra member — that is why its counts are one more than the served list; this file serves the fixture person as
 *   the team's own member, which is what P8 did and why its counts are the served counts.
 * - **The saved view** (P2: picking `Table` wrote `last-selected-team-members-view-mode = TABLE`, a reload kept `Table`
 *   selected and the breadcrumb's last crumb became `Table`; P3: with that key seeded to `KANBAN` the page showed
 *   `Cards`, and the key was still `KANBAN` after the reload — nothing was written back).
 * - **Two served invitations** (probe 3 `V6` rows `You've been invited to join Served Alpha TeamAcceptReject` and
 *   `… Served Beta TeamAcceptReject`; probe 2 `A1` added that each row's buttons are `Accept`, `Reject` and `Close`); the
 *   mock heard nothing on `/invite/me`.
 * - **Accept** (probe 3 `V7`): served calls `GET /invite/me`, `GET /invite/me`, `PUT /invite/<id>/ACCEPTED` with no body,
 *   then `GET /invite/me` twice; the mock then logged `POST /api/auth/refresh-token` → `POST /api/auth/switch-organization`
 *   → `GET /api/user/me`, `GET /api/organization-team`, `GET /api/organization-team/<id>`, `GET /api/tasks/team`,
 *   `GET /api/timesheet/timer/status`, `POST /api/timesheet/statistics/tasks`, `GET /api/organization-projects`,
 *   `GET /api/languages`, `GET /api/invite`; the accepted row left, no dialog remained, `sessionStorage.removedInvitations`
 *   stayed `null`, the summary row was unchanged.
 * - **Reject** (probe 2 `A2`): the question was `Are you sure you want to reject the invitation?`, the write was
 *   `PUT /invite/<id>/REJECTED`, the row left at once, and the team's own invitation read (`GET /api/invite`, answered by
 *   the mock) was re-issued through the invalidation.
 * - **Discard** (probe 2 `A3`): after `Discard` the only served calls were the invitation reads, no write, both rows
 *   still there, no dialog, `removedInvitations` still `null`.
 * - **A refused accept** (probe 3 `V6`, the toasts from `s3-lane-a-home-0c.log`): for a 409 carrying
 *   `{statusCode:409, message:"served invitation expired"}` the dialog kept asking
 *   `Are you sure you want to accept the invitation? Discard Confirm` with **no** message line and both rows stayed; the
 *   console carried `[ERROR] [HttpClient] HTTP Error: PUT /invite/<id>/ACCEPTED 409 {statusCode: 409, …}` and
 *   `Mutation failed: ApiError: served invitation expired`, and the page itself threw the uncaught
 *   `served invitation expired`; two toasts appeared — the dev-only failure toast
 *   `DEVMutation faileduseRespondToInvitation.useMutation[acceptOrRejectMutation]409 · served invitation expiredCopy details`
 *   and the app's own `That change was not savedSomeone changed this at the same time. Refresh and try again.` — both from
 *   `s3-lane-a-home-0c.log` and `-0e.log`. Answering the *other* served invitation 500 on the same path printed the pair
 *   `DEVMutation faileduseRespondToInvitation.useMutation[acceptOrRejectMutation]500 · served refusalCopy details` and
 *   `That change was not savedThe server could not complete it. Try again in a moment.`, with the same unchanged question
 *   and both rows still there (`s3-lane-a-home-0e.log`).
 * - **Outstanding plans** (probe 3 `V5`, with probe 2 `B1` for the same copy read another way): served a plan of yesterday
 *   with one unfinished task and a plan of today → the notice read `1 task from past plans is still openFinish them or
 *   move them to today's plan.Review plans`, its link was `/profile/<user id>?name=Fixture Manager`, its only button was
 *   the dismiss, and `user_outstanding_notification_state` was written with that task's `<id>-open` hash; following its
 *   link landed on `/profile/<user id>` and left `task-tab` = `dailyplan` and `daily-plan-tab` = `Outstanding` (finding 9
 *   for the encoding each key carried when it was read). With the lane
 *   scenario `manager: true` **and** a past plan belonging to the fixture teammate, the manager notice appeared as
 *   `1 member has unfinished past plansFixture Teammate` linking `/profile/<teammate user id>?name=Fixture Teammate`, and
 *   `manager_outstanding_notification_state` was written; with `manager: false` and the same served plans neither the
 *   notice nor that key appeared (`manager_outstanding_notification_state` read `null`). On the mock's own answers — its
 *   only plan is dated today — no outstanding notice was on the page at all. The shell's own timezone `<output>` was on
 *   every one of those loads, so every notice assertion here is scoped by copy.
 * - **No member profile, no team** (probe 2 `E1`): with `/api/user/me` served without an `employee` and the team list
 *   served empty, the page kept its shell mark at `ever-teams:shell-bootstrap-start` (never `shell-ready`), showed **no**
 *   `<h1>`, one `<h3>` `Your account has no member profile in this workspace`, the line
 *   `Teams, tasks and the timer show up once you are in a team.`, and **no** `Create new team` button. That is a different
 *   screen from the public-team page (`/public-team/…`). The same load still listed the mock's own pending invitation as
 *   `You've been invited to join Accept Reject` (no team name, because that invitation carries no `teams`), and its mock
 *   log held `GET /api/invite/me` twice and **no** team read at all. That panel is a `dynamic({ ssr: false })` import
 *   behind its own read and can arrive after the no-team screen is already on screen, which `s3-lane-a-home-0e.log` caught
 *   by reading it too early; test 10 now polls the mock's log for the read before pinning the row.
 *
 * ## Findings worth knowing (each from a printed line)
 *
 * 1. **A refused invitation says nothing about the refusal, and its rejection is never caught.**
 *    `use-respond-to-invitation.ts:39-41` only produces a `message` when the *answer body* carries one; an HTTP refusal
 *    rejects `acceptOrRejectMutation.mutateAsync` (`:36` `mutationFn`, `:66-70`, and that `useMutation` has no `onError`),
 *    so `ConfirmModal`'s `notifyMessage` (`team-invitations.tsx:183`) is never set: the question stays open with its two
 *    buttons and the row stays. **The rejection itself goes unhandled**: the Confirm button's `onClick` runs
 *    `onAction()?.then(…)` with **no `.catch()`** (`core/components/teams/team-invitations.tsx:197-209`), `onAction` is
 *    `handleAcceptReject`, which just returns `acceptOrRejectInvitation(...)` (`:54-58`, passed as `onAction` at `:143`) —
 *    so the refused answer surfaces as an unhandled promise rejection, which is the `served invitation expired` page error
 *    test 8 pins (`MEASURE 409 page errors`). No comment, test or copy says a refusal must be caught, so this is stated as
 *    behaviour, not as a deviation. What the person *is* told is the app's own fallback toast — `toasts.MUTATION_FAILED`
 *    plus `toasts.REASONS.CONFLICT` for a 409, plus `toasts.REASONS.SERVER` for a 500 — which never repeats the server's
 *    text (`error-feedback.ts` "Server and exception texts are never shown"); the server's own text only reaches the
 *    dev-only toast (`core/components/common/dev-error-toaster.tsx`) and the console line. Test 8 pins all of that.
 * 2. **Accept and reject are deliberately not the same operation** (`use-respond-to-invitation.ts:19-21`): accept leaves
 *    the invitation cache alone and re-reads the session, which re-runs the whole shell bootstrap; reject edits the cache
 *    and invalidates both invitation queries. Pinned as the two different call sets in tests 5 and 6.
 * 3. **`isTrackingTime` alone is not "working now"** (`team-members.utils.ts:75-84`): a member whose employee is tracking
 *    but whose team read carries no `timerStatus` counts as `idle`. Test 2 pins it by serving exactly that member and
 *    getting no working-now span.
 * 4. **`/api/timesheet/timer/status/worked` is only asked when somebody tracks outside the team**
 *    (`use-today-seconds-without-team.ts:26-45`), and this lane's mock answers that path with its catch-all
 *    `{items:[],total:0}` rather than the array `timer.service.ts:325-332` promises — so `statuses?.find` threw
 *    `TypeError: statuses?.find is not a function` inside `TodayWorkedTime`, caught by React's error boundary
 *    (`probe-home-run-5.log` A: "The above error occurred in the <TodayWorkedTime> component. It was handled by the
 *    <ErrorBoundaryHandler> error boundary."). Test 2 answers that path with `[]` and pins that the card then renders
 *    with an empty console.
 * 5. **Unused locale keys:** `locales/en.json:2346-2352` still carries `pages.home.OUTSTANDING_NOTIFICATIONS.*` —
 *    `"SUBJECT": "You have"`, `"USER_LABEL": "uncompleted tasks, please check in"`, `"OUTSTANDING_VIEW": "Outstanding"`,
 *    `"VIEW_BUTTON": "View"`, `"MANAGER_LABEL": "{count, plural, one {# team member} other {# team members}} with
 *    uncompleted tasks, please see"` — and no component asks for any of it (`grep` of `OUTSTANDING_NOTIFICATIONS` outside
 *    `locales/` finds only the locale file). The panel the page renders takes its words from
 *    `notifications.NOTICES.OUTSTANDING_TITLE` / `OUTSTANDING_TEXT` / `OUTSTANDING_ACTION`
 *    (`team-outstanding-notifications.tsx:93-105`), which is what test 9 pins. Nothing about the shipped behaviour says it
 *    does not want those keys — they are simply unused.
 * 6. **`pages.home.BREADCRUMB` is a JSON string holding an array, not a label**: `"[\"Home\"]"` (`locales/en.json:2338`),
 *    and `page-component.tsx:74` puts the parsed `["Home"]` straight into the crumb's `title`, so React prints `Home`.
 *    Test 1 pins the crumb text `Home`, not a re-typed label.
 * 7. **The invitation panel is not part of the team half.** `page-component.tsx:127-135` renders it inside the same
 *    `AnimatedHeight` block as the outstanding notices, outside the `showsTeamParts &&` gate at `:110`, so a person with
 *    no team and no member profile still gets it (probe 2 `E1` body). Test 10 pins the row rather than asserting it away.
 * 8. **The open question prints as `Are you sure you want to accept the invitation? Discard Confirm`** (measured,
 *    `s3-lane-a-home-0.log`), and its Headless UI `Dialog` root is attached but has no box of its own (the panel is
 *    `position: fixed`), so Playwright reads the root as `hidden` while its heading and buttons are visible — hence
 *    `toBeAttached` on the root in test 5, and the two refusals pin that exact unchanged text.
 * 9. **The tab keys the outstanding-plan link writes get re-encoded by the page it opens.** The link writes
 *    `task-tab=dailyplan` and `daily-plan-tab=Outstanding` as plain strings (`team-outstanding-notifications.tsx:99-103`);
 *    the profile page reads both through `useLocalStorageState` (`core/hooks/tasks/use-task-filter.ts:112`,
 *    `core/components/users/user-profile-plans.tsx:189`), whose first read rewrites a legacy plain string as JSON
 *    (`core/hooks/common/use-local-storage-state.ts:37-47`,
 *    `window.localStorage.setItem(key, JSON.stringify(cleanValue))`). Which keys had been rewritten when the read ran is a
 *    mount-timing detail: `s3-lane-a-home-0d.log` printed `{"daily-plan-tab":"Outstanding","task-tab":"\"dailyplan\""}` and
 *    `s3-lane-a-home-0f.log` printed `{"daily-plan-tab":"\"Outstanding\"","task-tab":"\"dailyplan\""}`. Test 9 pins the two
 *    values the click chose, in either encoding, and prints the raw storage beside it.
 *
 * ## What this file does not cover
 *
 * The timer chrome (`TaskTimerSection`), the `Activity for today` block, the member grid and its header, the email
 * verification notice, the shell's sidebar and its other routes are pinned by the other lane-a files. The `Close` button
 * of an invitation row (`team-invitations.tsx:124-134`, which drops the row through the cache and remembers the id in
 * `sessionStorage.removedInvitations`) is named above but not driven. The notices' dismiss behaviour
 * (`core/lib/helpers/notifications.ts`) belongs to the notification suite. The Chatwoot widget is **not reachable
 * because the lane never sets the key that gates its script tag — `core/components/integration/chatwoot/index.tsx:14-17`
 * (`if (!websiteToken) { return; }`)**, so no bubble, iframe or `chatwootSDK.run` exists to assert on. `/kanban` beyond
 * the fact that the Kanban tab routes there, the `/profile/…` page the notices link to, and `app/api/**` proxy mode are
 * out of scope.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** `locales/en.json`, read by key: `pages.home` `:2338-2354`, `pages.about.COPY_DETAILS` `:3036`, `notifications.NOTICES` `:4281-4285`, `common`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	pages: { home: Record<string, string>; about: { COPY_DETAILS: string } };
	notifications: { NOTICES: Record<string, string> };
	toasts: { MUTATION_FAILED: string; REASONS: Record<string, string> };
	common: Record<string, string>;
	dashboard: { calendar: Record<string, string> };
};
const HOME = EN.pages.home;
const NOTICES = EN.notifications.NOTICES;
const COMMON = EN.common;

/**
 * `locales/en.json:2338` is the JSON string `"[\"Home\"]"`, and `page-component.tsx:74` puts what `JSON.parse` returns —
 * the one-element **array** `["Home"]` — straight into the crumb's `title`. React prints an array holding one string as
 * that string, which is why the crumb reads `Home`.
 */
const BREADCRUMB_CRUMB = JSON.parse(HOME.BREADCRUMB) as string[];
const BREADCRUMB_HOME = BREADCRUMB_CRUMB[0];

/** A locale plural filled the way next-intl fills it: `one` for 1, `other` for anything else, `#` for the count. */
const plural = (message: string, count: number) => {
	const forms = Array.from(
		message.matchAll(/\b(one|other)\s*\{([^}]*)\}/g),
		(match) => [match[1], match[2]] as const
	);
	const wanted = count === 1 ? 'one' : 'other';
	const form = forms.find(([name]) => name === wanted)?.[1];
	if (form === undefined) throw new Error(`no ${wanted} plural form in ${JSON.stringify(message)}`);
	return form.replaceAll('#', String(count));
};
const memberCountText = (count: number) => plural(HOME.MEMBER_COUNT, count);
const workingNowText = (count: number) => plural(HOME.WORKING_NOW, count);
/** The working-now wording without its number, taken from the locale rather than typed. */
const WORKING_NOW_WORDS = workingNowText(2).replace('2', '');
const outstandingTitleText = (count: number) => plural(NOTICES.OUTSTANDING_TITLE, count);
const managerTitleText = (count: number) => plural(NOTICES.MANAGER_TITLE, count);
/** A locale key this file needs verbatim: a missing key fails the run rather than becoming an empty filter. */
const requiredMessage = (group: Record<string, string>, key: string) => {
	const value = group[key];
	if (!value) throw new Error(`locales/en.json has no ${JSON.stringify(key)} in this message group`);
	return value;
};

const report = (label: string, value: unknown) =>
	console.log(`[lane-a home] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};
const answerJson = (route: Route, status: number, body?: unknown) =>
	route.fulfill({
		status,
		headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
		body: body === undefined ? '' : JSON.stringify(body)
	});
const answerOptions = (route: Route) => route.fulfill({ status: 204, headers: CORS_HEADERS });

/** The two hosts a home page on this lane may call. Nothing else is allowed, and nothing else was seen. */
const ALLOWED_ORIGINS = new Set([APP_ORIGIN, MOCK_API_ORIGIN]);

type Traffic = {
	/** Every request the context or a popup made, in the order the browser made them. */
	calls: () => Array<{ method: string; origin: string; path: string }>;
	/** The calls made after `mark()` was taken — the honest way to read "what the click did". */
	since: (mark: number) => Array<{ method: string; origin: string; path: string }>;
	origins: () => string[];
	/** Requests this guard refused, with the host that made them. */
	aborted: () => string[];
	mark: () => number;
};

/**
 * The safety guard, copied from `suites/lane-b/board-page-ui.spec.ts:183-208` (copied on purpose, so one file's
 * allow-list never becomes another file's). It records every request (a popup's too, through `context.on('request')`)
 * and aborts any host outside the two allowed ones, answering `route.fallback()` for the allowed hosts so the shield's
 * own interception (`playwright/fixtures.ts:110-112`) still runs.
 */
async function guardHosts(context: BrowserContext): Promise<Traffic> {
	const calls: Array<{ method: string; origin: string; path: string }> = [];
	const aborted: string[] = [];

	const record = (request: { method: () => string; url: () => string }) => {
		const url = new URL(request.url());
		calls.push({ method: request.method(), origin: url.origin, path: url.pathname });
	};
	context.on('request', record);
	context.on('page', (popup) => popup.on('request', record));

	await context.route('**/*', (route, request) => {
		const url = new URL(request.url());
		if (ALLOWED_ORIGINS.has(url.origin)) return route.fallback();
		aborted.push(`${request.method()} ${url.origin}${url.pathname}`);
		return route.abort('blockedbyclient');
	});

	return {
		calls: () => [...calls],
		since: (mark) => calls.slice(mark),
		origins: () => [...new Set(calls.map((call) => call.origin))].sort(),
		aborted: () => [...aborted],
		mark: () => calls.length
	};
}

/**
 * Asserts the safety rule for one test: the browser called the app and the mock and nothing else, and this file's guard
 * aborted nothing — which is also the proof that no Chatwoot or insight script was asked for.
 */
function expectAllowedHosts(traffic: Traffic, why: string) {
	const seen = traffic.origins();
	const outside = seen.filter((origin) => !ALLOWED_ORIGINS.has(origin));
	// Both sides sorted: `traffic.origins()` sorts, and a `Set` iterates in insertion order.
	expect(
		seen,
		`${why}: the browser called ${JSON.stringify(seen)} — only ${[...ALLOWED_ORIGINS].sort().join(' and ')} may be called`
	).toEqual([...ALLOWED_ORIGINS].sort().filter((origin) => seen.includes(origin)));
	expect(
		outside,
		`${why}: the page reached ${JSON.stringify(outside)}; a home page must never name a Chatwoot host or an insight host`
	).toEqual([]);
	expect(
		traffic.aborted(),
		`${why}: this file's guard had to abort ${JSON.stringify(traffic.aborted())} — nothing outside the two allowed hosts should have been asked for`
	).toEqual([]);
}

/** React's dev-mode store warning, seen on some home loads and not others (`suites/lane-b/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-45`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/**
 * `refreshToken` on this lane: `playwright/helpers.ts:176` sets `auth-refresh-token` to the literal
 * `synthetic-refresh-token`, which is not a JWS, so `decodeJWT` logs this exact line whenever a flow refreshes the
 * session (named in full by `suites/lane-b/workspace-welcome-ui.spec.ts:160-162`). Test 5 refreshes the session on
 * purpose, so the line belongs to the lane's token and not to the home page.
 */
const SYNTHETIC_TOKEN_DECODE_FAILURE =
	'[JWT] Failed to decode token: InvalidTokenError: Invalid token specified: missing part #2';
/** The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`). */
const armedHttpError = (verb: string, url: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${url} ${status}`;
const asRegex = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/**
 * Only the two lines this file excuses, and only in the test that arms them: `armedHttpError(...)` and — in test 8 alone —
 * `DEV_MUTATION_NOISE`. Every other test calls this with no expected list, so a `Mutation failed:` line appearing anywhere
 * else is a finding this file reports rather than hides.
 */
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** A day key in the shape `use-daily-plan-calculations.ts:92` compares (`YYYY-MM-DD`), moved by whole calendar days. */
const dayKey = () => {
	const day = new Date();
	return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};
const shiftDay = (days: number) => {
	const day = new Date();
	day.setDate(day.getDate() + days);
	return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};

type ServedCall = { method: string; path: string; body: string | null };

/* ------------------------------------------------------------------ the served team (test 2) */

/**
 * A team read in the shape the mock's own `makeEmployee`/`makeMember` answer with (`mock-gauzy-server.mjs:138-147`,
 * `:195-215`), so `organizationTeamSchema` (`core/types/schemas/team/organization-team.schema.ts:84-85`) accepts it —
 * probe 4's served members taught that by failing validation. The fixture person is served as the team's own member so
 * the member count is the served count (`useProcessedTeamMembers` only appends the viewer when the members leave them
 * out, which is what made probe 5's counts one too many).
 */
type ServedMember = { name: string; timerStatus?: string; isOnline?: boolean; isTrackingTime?: boolean };

async function serveTeam(page: Page, fixture: BootstrapFixture, members: ServedMember[]) {
	const employeeIdOf = (index: number) => `55555555-5555-4555-8555-4${String(index).padStart(11, '0')}`;
	const userIdOf = (index: number) => `44444444-4444-4444-8444-4${String(index).padStart(11, '0')}`;
	const employeeOf = (index: number, spec: ServedMember) => {
		const employeeId = employeeIdOf(index);
		const userId = userIdOf(index);
		const user = {
			id: userId,
			name: spec.name,
			firstName: spec.name.split(' ')[0],
			lastName: spec.name.split(' ').slice(1).join(' '),
			email: `served${index}@served.test`,
			timeZone: 'UTC',
			isEmailVerified: true,
			tenantId: fixture.ids.tenantA,
			employeeId
		};
		return {
			id: employeeId,
			userId,
			user,
			fullName: user.name,
			isTrackingEnabled: true,
			isTrackingTime: spec.isTrackingTime === true,
			isActive: true,
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			...(spec.isOnline === undefined ? {} : { isOnline: spec.isOnline })
		};
	};
	const memberOf = (index: number, employee: ReturnType<typeof employeeOf>, timerStatus?: string) => ({
		id: `66666666-6666-4666-8666-4${String(index).padStart(11, '0')}`,
		employeeId: employee.id,
		employee,
		user: employee.user,
		isManager: false,
		isActive: true,
		isTrackingEnabled: true,
		activeTaskId: null,
		activeTask: null,
		organizationTeamId: fixture.ids.teamA,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		roleId: fixture.ids.role,
		role: {
			id: fixture.ids.role,
			name: 'EMPLOYEE',
			isSystem: true,
			rolePermissions: [],
			tenantId: fixture.ids.tenantA
		},
		totalWorkedTasks: [],
		totalTodayTasks: [],
		...(timerStatus === undefined ? {} : { timerStatus })
	});

	const selfEmployee = {
		id: fixture.ids.employee,
		userId: fixture.ids.user,
		user: {
			id: fixture.ids.user,
			name: fixture.names.user,
			firstName: 'Fixture',
			lastName: 'Manager',
			email: 'manager@example.test',
			timeZone: 'UTC',
			isEmailVerified: true,
			tenantId: fixture.ids.tenantA,
			employeeId: fixture.ids.employee
		},
		fullName: fixture.names.user,
		isTrackingEnabled: true,
		isTrackingTime: false,
		isActive: true,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA
	};
	const servedMembers = [
		memberOf(0, { ...employeeOf(0, { name: fixture.names.user }), ...selfEmployee }),
		...members.map((spec, index) => memberOf(index + 1, employeeOf(index + 1, spec), spec.timerStatus))
	];
	const team = {
		id: fixture.ids.teamA,
		name: fixture.names.teamA,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		public: true,
		profile_link: fixture.profileLink,
		prefix: 'FIA',
		shareProfileView: false,
		requirePlanToTrack: false,
		members: servedMembers,
		managers: [servedMembers[0]],
		projects: [],
		tasks: [],
		statuses: [
			{
				id: fixture.ids.todoStatus,
				name: 'open',
				value: 'open',
				color: '#94a3b8',
				order: 1,
				isSystem: true,
				isDefault: true,
				isTodo: true,
				tenantId: fixture.ids.tenantA,
				organizationId: fixture.ids.organizationA,
				organizationTeamId: fixture.ids.teamA
			}
		]
	};
	const calls: ServedCall[] = [];
	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === '/api/organization-team' || /^\/api\/organization-team\/[^/]+$/.test(url.pathname)),
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return answerOptions(route);
			const pathname = new URL(request.url()).pathname;
			calls.push({ method: request.method(), path: pathname, body: request.postData() });
			if (pathname === '/api/organization-team') return answerJson(route, 200, { items: [team], total: 1 });
			return answerJson(route, 200, team);
		}
	);
	return { calls, team };
}

/**
 * `timer.service.ts:325-332` promises `ITimerStatus[]` for `/timesheet/timer/status/worked`; the mock answers that path
 * with its catch-all object, which is what made `TodayWorkedTime` throw in probe 5. This file answers `[]` and records
 * the calls, so the card renders and the read itself is pinned.
 */
async function serveWorkedLogs(page: Page) {
	const calls: ServedCall[] = [];
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === '/api/timesheet/timer/status/worked',
		async (route) => {
			if (route.request().method() === 'OPTIONS') return answerOptions(route);
			calls.push({ method: route.request().method(), path: '/api/timesheet/timer/status/worked', body: null });
			return answerJson(route, 200, []);
		}
	);
	return calls;
}

/* ------------------------------------------------------------------ the served invitations (tests 4-8) */

const INVITE_A = 'a1a1a1a1-1111-4111-8111-111111111111';
const INVITE_B = 'b2b2b2b2-2222-4222-8222-222222222222';
const MY_INVITES_ROUTE = '/api/invite/me';
const inviteWritePath = (id: string, action: 'ACCEPTED' | 'REJECTED') => `/api/invite/${id}/${action}`;
const ALPHA_ROW = `${HOME.INVITATIONS} Served Alpha Team${COMMON.ACCEPT}${COMMON.REJECT}`;
const BETA_ROW = `${HOME.INVITATIONS} Served Beta Team${COMMON.ACCEPT}${COMMON.REJECT}`;

type InviteScript = { answers?: Record<string, { status: number; message?: string }> };

/**
 * This file's stand-in for the invitation API, store-backed so that "the row left" can be told apart from "the server
 * still lists it": the list answer is always the current store, and an answered invitation is removed from it while a
 * refused one is not. `getMyInvitations` validates the answer with `inviteSchema` (`invite.service.ts:52-58`), so each
 * item carries `id`, `email`, `status`, `tenantId`, `organizationId` and the `teams` whose name the row prints. Only
 * `/invite/me` and the two write paths are matched, so every other invitation read (the team's own `GET /invite`) still
 * reaches the mock — probe 2 answered that one by mistake and the app reported
 * `Team invitations validation failed … expected number, received undefined` for it.
 */
async function serveInvitations(page: Page, fixture: BootstrapFixture, script: InviteScript = {}) {
	const invitationOf = (id: string, email: string, name: string) => ({
		id,
		email,
		status: 'INVITED',
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA,
		teams: [
			{ id: fixture.ids.teamA, name, organizationId: fixture.ids.organizationA, tenantId: fixture.ids.tenantA }
		]
	});
	const store = {
		items: [
			invitationOf(INVITE_A, 'invited-a@served.test', 'Served Alpha Team'),
			invitationOf(INVITE_B, 'invited-b@served.test', 'Served Beta Team')
		]
	};
	const calls: ServedCall[] = [];
	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === MY_INVITES_ROUTE || /^\/api\/invite\/[^/]+\/(ACCEPTED|REJECTED)$/.test(url.pathname)),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const pathname = new URL(request.url()).pathname;
			if (method === 'OPTIONS') return answerOptions(route);
			calls.push({ method, path: pathname, body: request.postData() });
			if (pathname === MY_INVITES_ROUTE) {
				return answerJson(route, 200, { items: store.items, total: store.items.length });
			}
			const id = pathname.split('/')[3];
			const refusal = script.answers?.[id];
			if (refusal && refusal.status >= 400) {
				// A refusal changes nothing in the store, so a row that stayed really means the server still lists it.
				return answerJson(route, refusal.status, {
					statusCode: refusal.status,
					message: refusal.message ?? 'served refusal'
				});
			}
			store.items = store.items.filter((item) => item.id !== id);
			const action = pathname.endsWith('ACCEPTED') ? 'ACCEPTED' : 'REJECTED';
			return answerJson(route, 200, {
				id,
				email: 'invited@served.test',
				status: action,
				tenantId: fixture.ids.tenantA,
				organizationId: fixture.ids.organizationA
			});
		}
	);
	return {
		calls,
		store: () => [...store.items],
		writes: () => calls.filter((call) => call.method !== 'GET'),
		shapes: () => calls.map((call) => `${call.method} ${call.path}${call.body === null ? '' : ` ${call.body}`}`)
	};
}

/* ------------------------------------------------------------------ the served daily plans (test 9) */

type ServedPlan = {
	id: string;
	date: string;
	employeeId: string;
	employee?: { id: string; fullName: string; user: { id: string; name: string } } | null;
	taskIds: string[];
	status: string;
	workTimePlanned: number;
};

/** Every `/api/daily-plan*` read gets the same store, so `outstandingPlans` and the sorted list agree. */
async function serveDailyPlans(page: Page, fixture: BootstrapFixture, plans: ServedPlan[]) {
	const taskOf = (id: string) => ({
		id,
		title: `Served task ${id.slice(-4)}`,
		number: 1,
		public: false,
		status: 'open',
		taskStatusId: fixture.ids.todoStatus,
		estimate: 3600,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		members: [],
		tags: [],
		teams: [
			{
				id: fixture.ids.teamA,
				name: fixture.names.teamA,
				organizationId: fixture.ids.organizationA,
				tenantId: fixture.ids.tenantA
			}
		]
	});
	const calls: ServedCall[] = [];
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith('/api/daily-plan'),
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return answerOptions(route);
			calls.push({ method: request.method(), path: new URL(request.url()).pathname, body: request.postData() });
			return answerJson(route, 200, {
				items: plans.map((plan) => ({
					id: plan.id,
					date: plan.date,
					workTimePlanned: plan.workTimePlanned,
					status: plan.status,
					employeeId: plan.employeeId,
					// the key is only present when there is an employee object to name (`mock`'s own plans carry none)
					...(plan.employee ? { employee: plan.employee } : {}),
					organizationTeamId: fixture.ids.teamA,
					organizationId: fixture.ids.organizationA,
					tenantId: fixture.ids.tenantA,
					tasks: plan.taskIds.map(taskOf)
				})),
				total: plans.length
			});
		}
	);
	return { calls };
}

const PAST_PLAN_ID = 'a7a7a7a7-7777-4777-8777-777777777777';
const TODAY_PLAN_ID = 'f6f6f6f6-6666-4666-8666-666666666666';
const PAST_TASK_ID = 'b8b8b8b8-8888-4888-8888-888888888888';

/* ------------------------------------------------------------------ the page's own pieces */

const summaryRow = (page: Page) =>
	page
		.getByRole('heading', { level: 1 })
		.first()
		.locator('xpath=..')
		.evaluate((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim());
const h1Texts = (page: Page) =>
	page
		.getByRole('heading', { level: 1 })
		.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()));
const tablist = (page: Page) => page.getByRole('tablist', { name: COMMON.VIEW, exact: true });
const tabStates = (page: Page) =>
	tablist(page)
		.getByRole('tab')
		.evaluateAll((nodes) =>
			nodes.map((node) => ({
				label: String(node.getAttribute('aria-label')),
				selected: String(node.getAttribute('aria-selected'))
			}))
		);
const selectedTabLabels = (page: Page) =>
	tablist(page)
		.getByRole('tab')
		.evaluateAll((nodes) =>
			nodes
				.filter((node) => node.getAttribute('aria-selected') === 'true')
				.map((node) => String(node.getAttribute('aria-label')))
		);
const breadcrumbCrumbTexts = (page: Page) =>
	page
		.getByRole('navigation', { name: 'breadcrumb', exact: true })
		.locator('ol > li')
		.evaluateAll((nodes) =>
			nodes
				.filter((node) => node.getAttribute('aria-hidden') !== 'true')
				.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
		);
const VIEW_MODE_KEY = 'last-selected-team-members-view-mode';
const REMOVED_INVITATIONS_KEY = 'removedInvitations';
/**
 * Reads the named storage entries in one trip to the page. `removedInvitations` is the session-storage one
 * (`team-invitations.tsx:43`, `:71`), everything else here is local — and the name has to appear as a literal inside the
 * callback, because a Node-side variable is not visible in the page.
 */
const storageOf = (page: Page, keys: string[]) =>
	page.evaluate((names) => {
		const found: Record<string, string> = {};
		for (const name of names) {
			const value =
				name === 'removedInvitations' ? window.sessionStorage.getItem(name) : window.localStorage.getItem(name);
			found[name] = String(value);
		}
		return found;
	}, keys);
const invitationRows = (page: Page) =>
	page
		.locator('li')
		.filter({ hasText: HOME.INVITATIONS })
		.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
const invitationRow = (page: Page, index = 0) => page.locator('li').filter({ hasText: HOME.INVITATIONS }).nth(index);
const rowButtonNames = (page: Page) =>
	page
		.locator('li')
		.filter({ hasText: HOME.INVITATIONS })
		.evaluateAll((nodes) =>
			Array.from(nodes, (node) =>
				Array.from(
					node.querySelectorAll('button'),
					(button) => (button.textContent ?? '').trim() || String(button.getAttribute('aria-label'))
				)
			)
		);
const notices = (page: Page) =>
	page
		.locator('output')
		.evaluateAll((nodes) =>
			nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()).filter((text) => text.length > 3)
		);
const noticeOf = (page: Page, text: string) => page.locator('output').filter({ hasText: text });
/**
 * The Headless UI `Dialog` root (`modal.tsx`'s `<Dialog as="div">`) is attached but has no layout box of its own — its
 * panel is `position: fixed` — so a visibility check on the root reads `hidden` on this lane (measured in
 * `s3-lane-a-home-0.log`), while its heading and its buttons are visible. Hence `toBeAttached` for the root.
 */
const dialogOf = (page: Page) => page.getByRole('dialog');
/** The confirm question as the open dialog prints it: the `Text.Heading as="h3"` then `Discard` and `Confirm` (`team-invitations.tsx:179-213`). */
const dialogTextOf = (question: string) => `${question} ${COMMON.DISCARD} ${COMMON.CONFIRM}`;
/** The open dialog's own text, flattened the same way, so `dialogTextOf` can be compared with it. */
const dialogText = (page: Page) => dialogOf(page).innerText().then(flat);
/** Every toast on screen, as the browser prints it. */
const toastTexts = (page: Page) =>
	page
		.locator('[data-sonner-toast]')
		.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));

/** The mock's request log as `METHOD path`, the query dropped so it can be compared with the browser's own calls. */
const shapeMockRequests = (requests: Array<{ method: string; path: string; status: number }>) =>
	requests
		.filter((request) => request.status > 0)
		.map((request) => `${request.method} ${request.path.split('?')[0]}`)
		.sort();
const shapeTraffic = (traffic: Traffic, origin: string) =>
	traffic
		.calls()
		.filter((call) => call.origin === origin)
		.map((call) => `${call.method} ${call.path}`)
		.sort();

/**
 * The order `playwright/helpers.ts:439-451` documents: guard first, then this file's routes, then the cookies, then the
 * navigation. `fresh: true` takes the previous case's page routes away first, so one test can visit the home several
 * times with a different served answer each time.
 */
async function openHome<S>(
	page: Page,
	fixture: BootstrapFixture,
	routes: (page: Page) => Promise<S>,
	options: { requireShell?: boolean; fresh?: boolean } = {}
): Promise<{ traffic: Traffic; served: S }> {
	if (options.fresh !== false) await page.unrouteAll({ behavior: 'ignoreErrors' });
	const traffic = await guardHosts(page.context());
	const served = await routes(page);
	await signInAndVisit(page, fixture, '/', { requireShell: options.requireShell });
	return { traffic, served };
}

const servedInvitations = async (page: Page, fixture: BootstrapFixture, script: InviteScript = {}) =>
	openHome(page, fixture, async (target) => serveInvitations(target, fixture, script));

test.describe('lane-a · the home page: what a member is told and what the browser is asked for', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// -------------------------------- 1. the lane's own home, nothing stubbed

	test('1 · the member home as printed: breadcrumb, team name and figures, the view switch, and every read of the load', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const { traffic } = await openHome(page, fixture, async () => undefined, { fresh: false });

		// `page-component.tsx:74-77`: `Home`, the team, then the view name.
		expect(BREADCRUMB_CRUMB, 'what `JSON.parse(t("pages.home.BREADCRUMB"))` actually is').toEqual(['Home']);
		await expect
			.poll(() => breadcrumbCrumbTexts(page), {
				message: 'the home breadcrumb',
				timeout: 25_000
			})
			.toEqual([BREADCRUMB_HOME, fixture.names.teamA, COMMON.CARDS]);
		report('breadcrumb crumbs', await breadcrumbCrumbTexts(page));
		await expect(
			page.getByRole('navigation', { name: 'breadcrumb', exact: true }).locator('li[aria-current="page"]'),
			'the last crumb is the current page (`breadcrumb.tsx`)'
		).toHaveText(COMMON.CARDS);

		// `team-live-summary.tsx:29-32`: the team name is the only `<h1>`, and its line carries the member count.
		await expect
			.poll(() => h1Texts(page), { message: 'one `<h1>`, and it is the team name', timeout: 25_000 })
			.toEqual([fixture.names.teamA]);
		// The mock's own team has three members (`mock-gauzy-server.mjs:216-225`), none of them tracking.
		await expect
			.poll(() => summaryRow(page), {
				message: 'the summary row is the team name and the member count, concatenated as the DOM holds them',
				timeout: 25_000
			})
			.toBe(`${fixture.names.teamA}${memberCountText(3)}`);
		await expect
			.poll(() => summaryRow(page), {
				message: "no member of the mock's team is tracking, so no working-now figure is rendered",
				timeout: 25_000
			})
			.not.toContain(WORKING_NOW_WORDS);
		report('h1 texts', await h1Texts(page));
		report('summary row', await summaryRow(page));

		// `header-tabs.tsx:11-16` through `segmented-control.tsx`: four tabs, labelled from `common.*`, Cards selected.
		await expect
			.poll(() => tabStates(page).then((tabs) => tabs.map((tab) => tab.label)), {
				message: 'the switch offers the four views in the order the component lists them',
				timeout: 25_000
			})
			.toEqual([COMMON.CARDS, COMMON.TABLE, COMMON.BLOCKS, COMMON.KANBAN]);
		await expect
			.poll(() => tabStates(page).then((tabs) => tabs.find((tab) => tab.selected === 'true')?.label), {
				message: 'nothing was picked yet, so the switch shows the atom default `CARDS` (`header-tabs.ts:3`)',
				timeout: 25_000
			})
			.toBe(COMMON.CARDS);
		report('tabs', await tabStates(page));

		// The load's reads, compared on both sides: the mock's own log, and this file's record of the browser's calls.
		const mockSide = shapeMockRequests(await mock.requests());
		const browserSide = shapeTraffic(traffic, MOCK_API_ORIGIN);
		report('mock-side reads', mockSide);
		report('browser-side mock reads', browserSide);
		expect(
			[...new Set(browserSide)].sort(),
			'the paths the browser asked the mock are exactly the paths the mock answered — nothing else reached it'
		).toEqual([...new Set(mockSide)].sort());
		const browserUserReads = browserSide.filter((line) => line === 'GET /api/user/me').length;
		const mockUserReads = mockSide.filter((line) => line === 'GET /api/user/me').length;
		report('user/me reads, browser side vs mock side', { browserUserReads, mockUserReads });
		expect(
			mockUserReads,
			`the mock answered ${mockUserReads} \`GET /api/user/me\` while the browser made ${browserUserReads}: the extra reads were not browser-made`
		).toBeGreaterThanOrEqual(browserUserReads);
		expect(
			mockSide.filter((line) => line.includes('/api/organization-team')).length,
			'the team was read twice: the list the shell picks the team from, and the active team itself'
		).toBe(2);
		expect(
			mockSide.filter((line) => line === 'GET /api/invite/me').length,
			"the person's own invitations were read (`next dev` Strict Mode mounts the query twice)"
		).toBeGreaterThanOrEqual(1);

		// The Chatwoot and Vercel gates: nothing outside the two allowed origins was even asked for.
		expectAllowedHosts(traffic, 'the home load as the lane serves it');
		expect(traffic.aborted(), 'the Chatwoot script and the insight script were never requested').toEqual([]);
		report('origins', traffic.origins());

		expect(
			consoleFindings(shield),
			`the home load left console findings: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
		expect(shield.pageErrors(), 'the home load threw nothing').toEqual([]);
	});

	// -------------------------------- 2. working now, which only the team read can say

	test('2 · working now: a teammate whose timer runs, one whose does not, singular and plural', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// `team-members.utils.ts:68-85`: `timerStatus: 'running'` is what makes a member count.
		const first = await openHome(page, fixture, async (target) =>
			serveTeam(target, fixture, [
				{ name: 'Served Running Member', timerStatus: 'running' },
				{ name: 'Served Idle Member' }
			])
		);
		await expect
			.poll(() => summaryRow(page), { timeout: 25_000 })
			.toBe(`${fixture.names.teamA}${memberCountText(3)}${workingNowText(1)}`);
		report('one running: summary row', await summaryRow(page));
		expect(
			await mock.calls('/organization-team'),
			'this file answered the team read; the mock heard nothing about a team'
		).toEqual([]);
		expect(
			consoleFindings(shield),
			`a served running member produced findings: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
		expectAllowedHosts(first.traffic, 'a home with one running member');

		// Plural: two running members, one paused.
		const second = await openHome(page, fixture, async (target) =>
			serveTeam(target, fixture, [
				{ name: 'Served Running Member', timerStatus: 'running' },
				{ name: 'Served Second Running Member', timerStatus: 'running' },
				{ name: 'Served Paused Member', timerStatus: 'pause' }
			])
		);
		await expect
			.poll(() => summaryRow(page), {
				message: 'two counted members read as the plural form, and a paused member adds nothing to it',
				timeout: 25_000
			})
			.toBe(`${fixture.names.teamA}${memberCountText(4)}${workingNowText(2)}`);
		report('two running: summary row', await summaryRow(page));
		expectAllowedHosts(second.traffic, 'a home with two running members');

		// `isTrackingTime` alone is not working now (`team-members.utils.ts:75-84`), and neither is a paused member.
		const third = await openHome(page, fixture, async (target) =>
			serveTeam(target, fixture, [
				{ name: 'Served Tracking But Not Running Member', isTrackingTime: true },
				{ name: 'Served Paused Member', timerStatus: 'pause' }
			])
		);
		await expect
			.poll(() => summaryRow(page), {
				message: 'nobody counts, so the working-now span is not rendered at all (`team-live-summary.tsx:33`)',
				timeout: 25_000
			})
			.toBe(`${fixture.names.teamA}${memberCountText(3)}`);
		await expect.poll(() => summaryRow(page), { timeout: 25_000 }).not.toContain(WORKING_NOW_WORDS);
		report('nothing running: summary row', await summaryRow(page));
		expect(
			(await mock.calls('/timer/status/worked')).length,
			'nobody tracks outside the team, so the worked-logs read was never asked for'
		).toBe(0);
		expectAllowedHosts(third.traffic, 'a home with nobody working');

		// The third way to count: the timer runs, but outside this team (`team-member-tracking.ts:22-26`).
		const fourth = await openHome(page, fixture, async (target) => {
			const worked = await serveWorkedLogs(target);
			const team = await serveTeam(target, fixture, [
				{ name: 'Served Outside Team Member', isOnline: true, isTrackingTime: true, timerStatus: 'pause' },
				{ name: 'Served Paused Member', timerStatus: 'pause' }
			]);
			return { worked, team };
		});
		await expect
			.poll(() => summaryRow(page), {
				message: 'a member whose timer runs outside this team counts as working here',
				timeout: 25_000
			})
			.toBe(`${fixture.names.teamA}${memberCountText(3)}${workingNowText(1)}`);
		report('outside-team tracker: summary row', await summaryRow(page));
		await expect.poll(() => fourth.served.worked.length, { timeout: 25_000 }).toBeGreaterThan(0);
		report('worked-log calls', fourth.served.worked);
		expect(
			await mock.calls('/timer/status/worked'),
			'this file answered the worked-logs read with an array, which is the only answer that keeps `TodayWorkedTime` rendering'
		).toEqual([]);
		expect(
			consoleFindings(shield),
			`answering the worked logs with an array left the card with nothing to report: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
		expectAllowedHosts(fourth.traffic, 'a home with an outside-team tracker');
	});

	// -------------------------------- 3. the saved view, and the one that must not come back

	test('3 · the saved view: Table survives a reload, a saved Kanban comes back as Cards', async ({
		page,
		fixture
	}) => {
		await openHome(page, fixture, async () => undefined, { fresh: false });

		// `header-tabs.tsx:62-67`: any pick but Kanban writes the atom and the storage key.
		await tablist(page).getByRole('tab', { name: COMMON.TABLE, exact: true }).click({ timeout: 15_000 });
		await expect(tablist(page).getByRole('tab', { name: COMMON.TABLE, exact: true })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect
			.poll(() => storageOf(page, [VIEW_MODE_KEY]).then((stored) => stored[VIEW_MODE_KEY]), {
				message: 'the key named by `constants.tsx:692` is what `setLastTeamMembersViewMode` writes',
				timeout: 25_000
			})
			.toBe('TABLE');
		report('storage after the Table pick', await storageOf(page, [VIEW_MODE_KEY]));
		await expect
			.poll(() => breadcrumbCrumbTexts(page), {
				message: "the breadcrumb's last crumb follows the chosen view",
				timeout: 25_000
			})
			.toEqual([BREADCRUMB_HOME, fixture.names.teamA, COMMON.TABLE]);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect
			.poll(() => selectedTabLabels(page), {
				message: 'the reload restored the saved view (`page-component.tsx:83-91`)',
				timeout: 25_000
			})
			.toEqual([COMMON.TABLE]);
		await expect
			.poll(() => storageOf(page, [VIEW_MODE_KEY]).then((stored) => stored[VIEW_MODE_KEY]), {
				message: 'the saved value is still there after the restore',
				timeout: 25_000
			})
			.toBe('TABLE');
		report('storage after the reload', await storageOf(page, [VIEW_MODE_KEY]));

		// A Kanban saved under that key is deliberately not restored (`page-component.tsx:86-88`): `/` shows Cards.
		await page.evaluate(
			([key, value]: string[]) => window.localStorage.setItem(key, value),
			[VIEW_MODE_KEY, 'KANBAN']
		);
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		await expect
			.poll(() => selectedTabLabels(page), {
				message: 'a saved Kanban is not a home view, so the page shows Cards',
				timeout: 25_000
			})
			.toEqual([COMMON.CARDS]);
		await expect
			.poll(() => storageOf(page, [VIEW_MODE_KEY]).then((stored) => stored[VIEW_MODE_KEY]), {
				message: 'the page reads the key and writes nothing back into it',
				timeout: 25_000
			})
			.toBe('KANBAN');
		report('storage with a saved Kanban', await storageOf(page, [VIEW_MODE_KEY]));

		// The key's only writer skips Kanban and routes instead (`header-tabs.tsx:62-72`), so Kanban never lands in it.
		await tablist(page).getByRole('tab', { name: COMMON.KANBAN, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe('/kanban');
		await expect
			.poll(() => storageOf(page, [VIEW_MODE_KEY]).then((stored) => stored[VIEW_MODE_KEY]), {
				message: 'picking Kanban wrote nothing: the Kanban tab is a route, not a saved view',
				timeout: 25_000
			})
			.toBe('KANBAN');
		report('storage after the Kanban pick', await storageOf(page, [VIEW_MODE_KEY]));
	});

	// -------------------------------- 4-8. the invitation panel and its four outcomes

	test('4 · two served invitations: the panel as printed, and the read that filled it', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const { traffic, served } = await servedInvitations(page, fixture);

		await expect.poll(() => invitationRows(page).then((rows) => rows.length), { timeout: 25_000 }).toBe(2);
		await expect
			.poll(() => invitationRows(page), {
				message: '`team-invitations.tsx:97-100` prints the sentence and then the team name in a bold span',
				timeout: 25_000
			})
			.toEqual([ALPHA_ROW, BETA_ROW]);
		await expect
			.poll(() => rowButtonNames(page), {
				message: 'every row offers Accept, Reject, and a ghost button named by `common.CLOSE`',
				timeout: 25_000
			})
			.toEqual([
				[COMMON.ACCEPT, COMMON.REJECT, COMMON.CLOSE],
				[COMMON.ACCEPT, COMMON.REJECT, COMMON.CLOSE]
			]);
		report('invitation rows', await invitationRows(page));
		report('invitation row buttons', await rowButtonNames(page));

		expect(
			served.calls.filter((call) => call.method === 'GET' && call.path === MY_INVITES_ROUTE).length,
			'the panel exists because the invitation read answered (`page-component.tsx:127-135`)'
		).toBeGreaterThanOrEqual(1);
		const mockInvitations = (await mock.calls('/invite')).map(
			(request) => `${request.method} ${request.path.split('?')[0]}`
		);
		report('mock-side invitation reads', mockInvitations);
		expect(
			mockInvitations.filter((line) => line.includes('/invite/me')),
			"the mock was never asked for this person's own invitations: this file answered every one of those reads"
		).toEqual([]);
		expect(
			mockInvitations.filter((line) => !line.includes('/invite/me')).length,
			"the team's own invitation read (`GET /invite?where[teams][id][0]=…`) is still answered by the mock"
		).toBeGreaterThanOrEqual(1);
		expectAllowedHosts(traffic, 'the invitation panel');
		expect(
			consoleFindings(shield),
			`the invitation panel left findings: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('5 · accept: the question, the PUT, the row leaving, and everything the page re-read after it', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const { traffic, served } = await servedInvitations(page, fixture);
		await expect.poll(() => invitationRows(page).then((rows) => rows.length), { timeout: 25_000 }).toBe(2);

		await invitationRow(page).getByRole('button', { name: COMMON.ACCEPT, exact: true }).click({ timeout: 15_000 });
		const dialog = dialogOf(page);
		await expect(dialog, 'the confirm question opens a Headless UI `Dialog`').toBeAttached();
		await expect
			.poll(() => dialogText(page), { message: 'the question, then its two buttons', timeout: 25_000 })
			.toBe(dialogTextOf(HOME.CONFIRM_ACCEPT_INVITATION));
		report('accept dialog', await dialogText(page));
		await expect(
			dialog.getByRole('heading', { level: 3, name: HOME.CONFIRM_ACCEPT_INVITATION, exact: true })
		).toHaveCount(1);

		const mockMark = (await mock.requests()).length;
		const trafficMark = traffic.mark();
		await dialog.getByRole('button', { name: COMMON.CONFIRM, exact: true }).click({ timeout: 15_000 });

		await expect.poll(() => served.writes().length, { timeout: 25_000 }).toBe(1);
		const write = served.writes()[0];
		report('accept write', write);
		expect(write.method, '`invite.service.ts:96-104` answers this with a PUT on this lane').toBe('PUT');
		expect(write.path, 'the answer is addressed `/invite/<id>/<action>`').toBe(
			inviteWritePath(INVITE_A, 'ACCEPTED')
		);
		expect(write.body, 'the PUT carries no body').toBeNull();

		await expect
			.poll(() => invitationRows(page).then((rows) => rows.map((row) => flat(row))), { timeout: 25_000 })
			.toEqual([BETA_ROW]);
		await expect(dialogOf(page)).toHaveCount(0);
		expect(
			served.store().map((item) => item.id),
			'the stand-in stopped listing the accepted invitation'
		).toEqual([INVITE_B]);
		report('invitation calls after accept', served.shapes());
		expect(
			served.calls.filter((call) => call.method === 'GET' && call.path === MY_INVITES_ROUTE).length,
			'accept re-reads the list: `refreshToken` + `router.refresh` (`use-respond-to-invitation.ts:44-48`) re-mounts the panel'
		).toBeGreaterThanOrEqual(3);

		// What `router.refresh()` costs on this lane, read from the mock's own log after the confirm.
		const afterConfirm = (await mock.requests())
			.slice(mockMark)
			.map((request) => `${request.method} ${request.path.split('?')[0]}`)
			.sort();
		report('mock reads after confirm', afterConfirm);
		expect(
			afterConfirm.filter((line) => line === 'POST /api/auth/refresh-token').length,
			'accept refreshed the session'
		).toBeGreaterThanOrEqual(1);
		expect(
			afterConfirm.filter((line) => line === 'POST /api/auth/switch-organization').length,
			'that refresh re-entered the organization, which is the session update the hook documents at `:20`'
		).toBeGreaterThanOrEqual(1);
		expect(
			afterConfirm.filter((line) => line === 'GET /api/user/me').length,
			'and the shell re-read its own bootstrap'
		).toBeGreaterThanOrEqual(1);
		expect(
			afterConfirm.filter((line) => line === 'GET /api/organization-team').length,
			'and re-read the team'
		).toBeGreaterThanOrEqual(1);
		expect(
			await mock.calls('/invite/me'),
			"the mock was never asked for this person's invitations: this file answered every one"
		).toEqual([]);

		await expect
			.poll(() => storageOf(page, [REMOVED_INVITATIONS_KEY]), {
				message: 'accept never uses the `removedInvitations` session key',
				timeout: 25_000
			})
			.toEqual({ [REMOVED_INVITATIONS_KEY]: 'null' });
		await expect
			.poll(() => summaryRow(page), { message: 'accepting changed no team figure', timeout: 25_000 })
			.toBe(`${fixture.names.teamA}${memberCountText(3)}`);
		report('summary after accept', await summaryRow(page));
		expect(
			traffic.since(trafficMark).filter((call) => call.path === '/api/timesheet/timer/status/worked'),
			'accepting an invitation never asked for the worked logs'
		).toEqual([]);
		expectAllowedHosts(traffic, 'the accept flow');
		expect(
			shield.logMatching(asRegex(SYNTHETIC_TOKEN_DECODE_FAILURE)).length,
			"the session refresh ran, and this lane's `auth-refresh-token` is not a JWS, so this exact line belongs to the lane"
		).toBeGreaterThanOrEqual(1);
		expect(
			consoleFindings(shield, [SYNTHETIC_TOKEN_DECODE_FAILURE]),
			`the accept flow left findings beyond that line: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('6 · reject: the question, the PUT, the row leaving at once, and the panel going with the last row', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const { traffic, served } = await servedInvitations(page, fixture);
		await expect.poll(() => invitationRows(page).then((rows) => rows.length), { timeout: 25_000 }).toBe(2);

		await invitationRow(page).getByRole('button', { name: COMMON.REJECT, exact: true }).click({ timeout: 15_000 });
		const dialog = dialogOf(page);
		await expect(
			dialog.getByRole('heading', { level: 3, name: HOME.CONFIRM_REJECT_INVITATION, exact: true })
		).toHaveCount(1);
		await dialog.getByRole('button', { name: COMMON.CONFIRM, exact: true }).click({ timeout: 15_000 });

		await expect.poll(() => served.writes().length, { timeout: 25_000 }).toBe(1);
		report('reject write', served.writes()[0]);
		expect(served.writes()[0].path, '`REJECTED` is the action the service puts in the path').toBe(
			inviteWritePath(INVITE_A, 'REJECTED')
		);
		await expect
			.poll(() => invitationRows(page).then((rows) => rows.map((row) => flat(row))), { timeout: 25_000 })
			.toEqual([BETA_ROW]);
		expect(
			served.store().map((item) => item.id),
			'the row left the page before any re-read of the list'
		).toEqual([INVITE_B]);

		// Reject invalidates both invitation caches (`use-respond-to-invitation.ts:57-60`); the team's own invitation
		// read is the one of the two that the mock answers.
		await expect
			.poll(
				async () =>
					(await mock.calls('/invite')).map((request) => `${request.method} ${request.path.split('?')[0]}`),
				{
					timeout: 25_000
				}
			)
			.toContain('GET /api/invite');
		report('invitation calls after reject', served.shapes());

		// The last pending one: with nothing pending the page renders no panel (`page-component.tsx:127-135`).
		await invitationRow(page).getByRole('button', { name: COMMON.REJECT, exact: true }).click({ timeout: 15_000 });
		await dialogOf(page).getByRole('button', { name: COMMON.CONFIRM, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => served.writes().length, { timeout: 25_000 }).toBe(2);
		await expect.poll(() => invitationRows(page).then((rows) => rows.length), { timeout: 25_000 }).toBe(0);
		await expect(
			page.locator('ul').filter({ hasText: HOME.INVITATIONS }),
			'the invitation list element went away with the last pending invitation'
		).toHaveCount(0);
		expect(served.store(), 'the stand-in has nothing left either').toEqual([]);
		await expect
			.poll(() => storageOf(page, [REMOVED_INVITATIONS_KEY]), {
				message: 'reject does not use the `removedInvitations` session key',
				timeout: 25_000
			})
			.toEqual({ [REMOVED_INVITATIONS_KEY]: 'null' });
		expectAllowedHosts(traffic, 'the reject flow');
		expect(
			consoleFindings(shield),
			`the reject flow left findings: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	test('7 · Discard: nothing is sent, and the row is exactly where it was', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const { traffic, served } = await servedInvitations(page, fixture);
		await expect.poll(() => invitationRows(page).then((rows) => rows.length), { timeout: 25_000 }).toBe(2);
		const trafficMark = traffic.mark();

		await invitationRow(page).getByRole('button', { name: COMMON.ACCEPT, exact: true }).click({ timeout: 15_000 });
		await expect(
			dialogOf(page).getByRole('heading', { level: 3, name: HOME.CONFIRM_ACCEPT_INVITATION, exact: true })
		).toHaveCount(1);
		await dialogOf(page).getByRole('button', { name: COMMON.DISCARD, exact: true }).click({ timeout: 15_000 });

		// A quiet window, not a wait for a result: 2 s in which no write is expected, which is what "Discard sent nothing"
		// means. 2 s is enough here — every run of this file (`s3-lane-a-home-0.log` through `-2.log`) saw the Discard path
		// settle well inside it, and the write the panel would send needs only the click that never happens.
		await page.waitForTimeout(2_000);

		expect(served.writes(), 'Discard sent nothing: the invitation stand-in logged no write at all').toEqual([]);
		report('invitation calls after Discard', served.shapes());
		expect(
			traffic
				.since(trafficMark)
				.filter(
					(call) =>
						call.origin === MOCK_API_ORIGIN && call.method !== 'GET' && call.path.startsWith('/api/invite')
				),
			'after Discard the browser sent nothing to the invitation API but reads'
		).toEqual([]);
		await expect(dialogOf(page)).toHaveCount(0);
		await expect
			.poll(() => invitationRows(page).then((rows) => rows.map((row) => flat(row))), { timeout: 25_000 })
			.toEqual([ALPHA_ROW, BETA_ROW]);
		await expect
			.poll(() => storageOf(page, [REMOVED_INVITATIONS_KEY]), {
				message: 'nothing was remembered in the session key either',
				timeout: 25_000
			})
			.toEqual({ [REMOVED_INVITATIONS_KEY]: 'null' });
		expect(
			(await mock.calls('/invite')).filter((request) => request.path.includes('/invite/me')),
			"the mock was asked about none of this person's own invitations"
		).toEqual([]);
		expectAllowedHosts(traffic, 'the Discard path');
		expect(consoleFindings(shield), `Discard left findings: ${JSON.stringify(shield.consoleErrors())}`).toEqual([]);
	});

	test('8 · a refused accept: a 409 with a message and a 500 — the row stays, and the question is all the page says', async ({
		page,
		fixture,
		shield
	}) => {
		const { traffic, served } = await servedInvitations(page, fixture, {
			answers: {
				[INVITE_A]: { status: 409, message: 'served invitation expired' },
				[INVITE_B]: { status: 500 }
			}
		});
		await expect.poll(() => invitationRows(page).then((rows) => rows.length), { timeout: 25_000 }).toBe(2);

		await invitationRow(page).getByRole('button', { name: COMMON.ACCEPT, exact: true }).click({ timeout: 15_000 });
		await dialogOf(page).getByRole('button', { name: COMMON.CONFIRM, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => served.writes().length, { timeout: 25_000 }).toBe(1);
		// A quiet window, for what the page does not do: 3 s in which the open question gains no message line and no row
		// disappears. The polls below then read what the dialog and the rows really hold.
		await page.waitForTimeout(3_000);

		await expect
			.poll(() => dialogText(page), {
				message:
					'the question and its two buttons are all the dialog holds — `ConfirmModal.notifyMessage` is only set by an answer body',
				timeout: 25_000
			})
			.toBe(dialogTextOf(HOME.CONFIRM_ACCEPT_INVITATION));
		await expect
			.poll(() => dialogText(page), {
				message: 'the refusal copy never reached the dialog',
				timeout: 25_000
			})
			.not.toContain('served invitation expired');
		report('409 dialog', await dialogText(page));
		await expect(dialogOf(page).getByRole('button', { name: COMMON.CONFIRM, exact: true })).toHaveCount(1);
		await expect
			.poll(() => invitationRows(page).then((rows) => rows.map((row) => flat(row))), { timeout: 25_000 })
			.toEqual([ALPHA_ROW, BETA_ROW]);
		expect(
			served.store().map((item) => item.id),
			'the server refused to accept it, so its list still holds it'
		).toEqual([INVITE_A, INVITE_B]);

		const mutationFailedTitle = EN.toasts.MUTATION_FAILED;
		const conflictReason = requiredMessage(EN.toasts.REASONS, 'CONFLICT');
		const serverReason = requiredMessage(EN.toasts.REASONS, 'SERVER');
		const copyDetails = requiredMessage(EN.pages.about, 'COPY_DETAILS');
		// The pointer is parked away from the toast stack before the toasts are read, so no toast is held open by a hover.
		await page.mouse.move(0, 0);
		await expect
			.poll(
				() =>
					toastTexts(page).then((texts) => ({
						appToast: texts.find((text) => text.startsWith(mutationFailedTitle)) ?? null,
						appToastRepeatsTheServerText: texts.some(
							(text) => text.startsWith(mutationFailedTitle) && text.includes('served invitation expired')
						),
						devToastCarriesTheRefusal: texts.some(
							(text) => text.includes(copyDetails) && text.includes('served invitation expired')
						)
					})),
				{
					message:
						"the refusal raises the app's own mutation-failure toast with the 409 reason in words (`mutation-error-toaster.tsx:47-52`); that copy never repeats the server's text, which only the dev-only failure toast carries (`core/components/common/dev-error-toaster.tsx`, mounted in development, copy not translated)",
					timeout: 25_000
				}
			)
			.toEqual({
				appToast: `${mutationFailedTitle}${conflictReason}`,
				appToastRepeatsTheServerText: false,
				devToastCarriesTheRefusal: true
			});
		report('409 toasts', await toastTexts(page));
		await expect(
			page.locator('output').filter({ hasText: 'served invitation expired' }),
			'and no `Notice` carries it either'
		).toHaveCount(0);

		const error409 = armedHttpError('PUT', `/invite/${INVITE_A}/ACCEPTED`, 409);
		await expect
			.poll(() => shield.logMatching(asRegex(error409)).length, { timeout: 25_000 })
			.toBeGreaterThanOrEqual(1);
		expect(
			shield.logMatching(asRegex(DEV_MUTATION_NOISE)).length,
			'the dev mutation-error toaster printed for the failed mutation (`mutation-error-toaster.tsx:43-45`)'
		).toBeGreaterThanOrEqual(1);
		await expect
			.poll(() => shield.pageErrors().filter((message) => message.includes('served invitation expired')).length, {
				message:
					'the refused mutation was caught by nothing on the page, so it surfaced as an unhandled rejection naming the refusal (`team-invitations.tsx:197-209`)',
				timeout: 25_000
			})
			.toBeGreaterThanOrEqual(1);
		report('409 page errors', shield.pageErrors());
		expect(
			consoleFindings(shield, [error409, DEV_MUTATION_NOISE]),
			`the 409 path left findings beyond its own HTTP error line and the dev toaster's line: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);

		// Close the unchanged question, then have the same path refuse the *second* invitation with a 500.
		await dialogOf(page).getByRole('button', { name: COMMON.DISCARD, exact: true }).click({ timeout: 15_000 });
		await invitationRow(page, 1)
			.getByRole('button', { name: COMMON.ACCEPT, exact: true })
			.click({ timeout: 15_000 });
		await dialogOf(page).getByRole('button', { name: COMMON.CONFIRM, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => served.writes().length, { timeout: 25_000 }).toBe(2);
		expect(served.writes()[1], 'the second write was the other invitation, answered 500').toMatchObject({
			method: 'PUT',
			path: inviteWritePath(INVITE_B, 'ACCEPTED')
		});

		const error500 = armedHttpError('PUT', `/invite/${INVITE_B}/ACCEPTED`, 500);
		await expect
			.poll(() => shield.logMatching(asRegex(error500)).length, { timeout: 25_000 })
			.toBeGreaterThanOrEqual(1);
		await expect
			.poll(() => dialogText(page), {
				message: 'a 500 keeps the same unchanged question',
				timeout: 25_000
			})
			.toBe(dialogTextOf(HOME.CONFIRM_ACCEPT_INVITATION));
		report('500 dialog', await dialogText(page));
		await page.mouse.move(0, 0);
		await expect
			.poll(
				() =>
					toastTexts(page).then((texts) =>
						texts.some((text) => text === `${mutationFailedTitle}${serverReason}`)
					),
				{
					message: 'a 500 raises the same app toast with the server reason copy (`toasts.REASONS.SERVER`)',
					timeout: 25_000
				}
			)
			.toBe(true);
		report('500 toasts', await toastTexts(page));
		await expect.poll(() => invitationRows(page).then((rows) => rows.length), { timeout: 25_000 }).toBe(2);
		expect(
			consoleFindings(shield, [error409, error500, DEV_MUTATION_NOISE]),
			`the two refusals left findings beyond their own HTTP error lines and the dev toaster's line: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
		expectAllowedHosts(traffic, 'the refused-accept path');
	});

	// -------------------------------- 9. outstanding plans: the member's own, and the manager's

	test('9 · outstanding daily plans: the member notice, its Review plans link, and the manager notice only for a manager', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const pastPlanOf = (employeeId: string, employee: ServedPlan['employee']): ServedPlan => ({
			id: PAST_PLAN_ID,
			date: shiftDay(-1),
			employeeId,
			employee,
			taskIds: [PAST_TASK_ID],
			status: 'open',
			workTimePlanned: 2
		});
		const todayPlan: ServedPlan = {
			id: TODAY_PLAN_ID,
			date: dayKey(),
			employeeId: fixture.ids.employee,
			taskIds: [fixture.ids.task],
			status: 'ready',
			workTimePlanned: 8
		};
		const teammateEmployee = {
			id: fixture.ids.teammateEmployee,
			fullName: fixture.names.teammate,
			user: { id: fixture.ids.teammateUser, name: fixture.names.teammate }
		};
		const selfEmployee = {
			id: fixture.ids.employee,
			fullName: fixture.names.user,
			user: { id: fixture.ids.user, name: fixture.names.user }
		};
		const plansForAManager = async (target: Page) => {
			const served = await serveDailyPlans(target, fixture, [
				pastPlanOf(fixture.ids.teammateEmployee, teammateEmployee),
				{ ...todayPlan, employee: undefined }
			]);
			return served;
		};

		// The manager branch, driven from both sides of the switch with the same served plans.
		await mock.scenario({ manager: true });
		// This `Traffic` keeps recording through every later visit of this test, so the host rule below covers them all.
		const homeVisits = await openHome(page, fixture, plansForAManager);
		await expect
			.poll(() => notices(page).then((list) => list.some((text) => text.includes(managerTitleText(1)))), {
				timeout: 25_000
			})
			.toBe(true);
		const managerNotice = noticeOf(page, managerTitleText(1));
		await expect
			.poll(() => managerNotice.innerText().then(flat), {
				message: 'the manager notice counts members, not tasks, and names each one',
				timeout: 25_000
			})
			.toBe(`${managerTitleText(1)} ${fixture.names.teammate}`);
		report('manager notice', flat(await managerNotice.innerText()));
		report(
			'manager notice links',
			await managerNotice
				.locator('a')
				.evaluateAll((nodes) =>
					nodes.map((node) => `${String(node.getAttribute('href'))}|${(node.textContent ?? '').trim()}`)
				)
		);
		await expect(
			managerNotice.getByRole('link', { name: fixture.names.teammate, exact: true }),
			"the member is named as a link to that member's profile (`team-outstanding-notifications.tsx:174`)"
		).toHaveAttribute('href', `/profile/${fixture.ids.teammateUser}?name=${fixture.names.teammate}`);
		await expect(
			managerNotice.getByRole('button', { name: NOTICES.DISMISS, exact: true }),
			'the manager notice can be dismissed'
		).toHaveCount(1);
		await expect
			.poll(() => storageOf(page, ['manager_outstanding_notification_state']), {
				message: 'its own key records the member it counted (`<employee id>-outstanding` hash)',
				timeout: 25_000
			})
			.toEqual({ manager_outstanding_notification_state: expect.stringContaining(fixture.ids.teammateEmployee) });

		// The member's own notice, on the very same served plans.
		const userNotice = noticeOf(page, outstandingTitleText(1));
		await expect
			.poll(() => userNotice.innerText().then(flat), {
				message:
					'one unfinished task of a past plan reads as the singular title, then the description, then the action',
				timeout: 25_000
			})
			.toBe(`${outstandingTitleText(1)} ${NOTICES.OUTSTANDING_TEXT} ${NOTICES.OUTSTANDING_ACTION}`);
		report('member notice', flat(await userNotice.innerText()));
		await expect(
			userNotice.getByRole('link', { name: NOTICES.OUTSTANDING_ACTION, exact: true }),
			"the action links to this person's own profile"
		).toHaveAttribute('href', `/profile/${fixture.ids.user}?name=${fixture.names.user}`);
		await expect
			.poll(
				() =>
					userNotice
						.getByRole('button')
						.evaluateAll((nodes) =>
							nodes.map(
								(node) => (node.textContent ?? '').trim() || String(node.getAttribute('aria-label'))
							)
						),
				{ message: "the notice's only button is its dismiss", timeout: 25_000 }
			)
			.toEqual([NOTICES.DISMISS]);
		await expect
			.poll(() => storageOf(page, ['user_outstanding_notification_state']), {
				message: 'the member notice records the past task it counted, under its own key',
				timeout: 25_000
			})
			.toEqual({ user_outstanding_notification_state: expect.stringContaining(PAST_TASK_ID) });

		// The panel this test pins is the one the page renders; the unused `pages.home.OUTSTANDING_NOTIFICATIONS.*` keys
		// (`locales/en.json:2346-2352`) are recorded as a finding in the header, not asserted on — no component renders them.

		// The same served plans with the member not managing the team: no manager notice, and nothing under its key.
		await mock.scenario({ manager: false });
		await openHome(page, fixture, plansForAManager);
		await expect
			.poll(() => notices(page).then((list) => list.some((text) => text.includes(outstandingTitleText(1)))), {
				timeout: 25_000
			})
			.toBe(true);
		await expect
			.poll(() => notices(page).then((list) => list.some((text) => text.includes(managerTitleText(1)))), {
				message: 'a member who is not the team manager is not shown the manager notice',
				timeout: 25_000
			})
			.toBe(false);
		report('notices for a plain member', await notices(page));
		await expect
			.poll(() => storageOf(page, ['manager_outstanding_notification_state']), {
				message: 'and nothing was written under the manager key',
				timeout: 25_000
			})
			.toEqual({ manager_outstanding_notification_state: 'null' });

		// Nothing outstanding on the lane's own answers (the mock's only plan is dated today): no notice at all. The
		// summary row is polled first, so "no notice" is read on a home that had finished loading rather than on an empty one.
		await openHome(page, fixture, async () => undefined);
		await expect
			.poll(() => summaryRow(page), {
				message: 'the lane home finished loading, with its own team',
				timeout: 25_000
			})
			.toBe(`${fixture.names.teamA}${memberCountText(3)}`);
		await expect
			.poll(
				() =>
					notices(page).then((list) =>
						[
							outstandingTitleText(1),
							outstandingTitleText(2),
							managerTitleText(1),
							managerTitleText(2)
						].some((title) => list.some((text) => text.includes(title)))
					),
				{
					message:
						'the lane offers no outstanding notice, member or manager (looked for by both plural forms of each locale title)',
					timeout: 25_000
				}
			)
			.toBe(false);
		report("notices on the lane's own plans", await notices(page));

		expectAllowedHosts(homeVisits.traffic, 'the outstanding-plans visits');
		expect(
			consoleFindings(shield),
			`the outstanding notices left findings on the home page: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);

		// Where the action leads: that person's profile, with the Outstanding tab chosen for the next visit. The console
		// is not read again after this click, because the click leaves the home page.
		await openHome(page, fixture, async (target) =>
			serveDailyPlans(target, fixture, [
				pastPlanOf(fixture.ids.employee, selfEmployee),
				{ ...todayPlan, employee: undefined }
			])
		);
		await expect
			.poll(() => notices(page).then((list) => list.some((text) => text.includes(outstandingTitleText(1)))), {
				timeout: 25_000
			})
			.toBe(true);
		await noticeOf(page, outstandingTitleText(1))
			.getByRole('link', { name: NOTICES.OUTSTANDING_ACTION, exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe(`/profile/${fixture.ids.user}`);
		/**
		 * The click wrote both keys as plain strings (`team-outstanding-notifications.tsx:99-103`). The profile page it opened
		 * reads them back through `useLocalStorageState` (`core/hooks/tasks/use-task-filter.ts:112` for `task-tab`,
		 * `core/components/users/user-profile-plans.tsx:189` for `daily-plan-tab`), whose first read rewrites a plain legacy
		 * value as JSON (`core/hooks/common/use-local-storage-state.ts:37-47`), so a stored tab can read as `Outstanding` or
		 * as `"Outstanding"` depending on which of those components had mounted when the read ran — `s3-lane-a-home-0d.log`
		 * caught `daily-plan-tab` plain, `s3-lane-a-home-0f.log` caught it quoted, `task-tab` quoted in both. The value each
		 * key holds is what is pinned, in either encoding; the raw strings are printed next to it.
		 */
		const decodeTab = (value: string) => (value.startsWith('"') ? (JSON.parse(value) as string) : value);
		await expect
			.poll(
				() =>
					storageOf(page, ['task-tab', 'daily-plan-tab']).then((raw) => ({
						'task-tab': decodeTab(raw['task-tab']),
						'daily-plan-tab': decodeTab(raw['daily-plan-tab'])
					})),
				{ timeout: 25_000 }
			)
			.toEqual({ 'task-tab': 'dailyplan', 'daily-plan-tab': 'Outstanding' });
		report('storage the action left, as the page stored it', await storageOf(page, ['task-tab', 'daily-plan-tab']));
		expect(
			consoleFindings(shield),
			`the outstanding notices left findings: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
	});

	// -------------------------------- 10. the state with no team to show

	test('10 · a person with no member profile and no team: the no-team screen, and no team half', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const { traffic } = await openHome(
			page,
			fixture,
			async () => {
				await page.route(
					(url) =>
						url.origin === MOCK_API_ORIGIN &&
						(url.pathname === '/api/user/me' ||
							url.pathname === '/api/organization-team' ||
							/^\/api\/organization-team\/[^/]+$/.test(url.pathname)),
					async (route) => {
						const request = route.request();
						if (request.method() === 'OPTIONS') return answerOptions(route);
						const pathname = new URL(request.url()).pathname;
						if (pathname === '/api/organization-team')
							return answerJson(route, 200, { items: [], total: 0 });
						if (/^\/api\/organization-team\/[^/]+$/.test(pathname)) {
							return answerJson(route, 404, { statusCode: 404, message: 'no served team' });
						}
						// The user with no `employee`: this is the shape `hasNoMemberProfile` keys on.
						return answerJson(route, 200, {
							id: fixture.ids.user,
							name: 'Served No Profile User',
							firstName: 'Served',
							lastName: 'No Profile',
							email: 'noprofile@served.test',
							timeZone: 'UTC',
							isEmailVerified: true,
							tenantId: fixture.ids.tenantA,
							defaultOrganizationId: fixture.ids.organizationA,
							lastOrganizationId: fixture.ids.organizationA
						});
					}
				);
			},
			// There is no shell to wait for: `criticalReady` (`init-state.tsx:251-258`) never settles without a team, and
			// `hardVisit(page, '/', { requireShell: false })` — which `signInAndVisit` passes through — is the sanctioned
			// way to visit a route that has no authenticated shell (`playwright/helpers.ts:416-432`).
			{ requireShell: false }
		);

		// `InitState` did mount and did start its critical reads — that mark is the proof the no-team page is the
		// authenticated shell's own page, just one whose reads never settle.
		await page.waitForFunction(
			() => window.performance.getEntriesByName('ever-teams:shell-bootstrap-start').length > 0,
			undefined,
			{
				timeout: 30_000
			}
		);

		// The screen itself first, so "no `<h1>`" is read on a finished screen rather than on an empty page.
		await expect(
			page.getByRole('heading', { level: 3, name: EN.dashboard.calendar.NO_MEMBER_TITLE, exact: true }),
			'`NoMemberProfile` is the screen for a person with no employee record (`no-team.tsx:51-63`)'
		).toHaveCount(1);
		await expect(page.getByText(EN.common.NO_MEMBER_PROFILE_MESSAGE, { exact: true })).toHaveCount(1);
		await expect
			.poll(() => h1Texts(page), {
				message: 'no team, so no team name and no summary (`page-component.tsx:66`, `:110-115`)',
				timeout: 25_000
			})
			.toEqual([]);
		report('no-team h1 texts', await h1Texts(page));
		await expect(
			page.getByRole('button', { name: COMMON.CREATE_TEAM, exact: true }),
			'that screen offers no team to create, because a team this account creates would not make it a member'
		).toHaveCount(0);
		// The invitation panel is not part of the team half (`page-component.tsx:127-135` sits outside the
		// `showsTeamParts &&` block), so the mock's own pending invitation is still listed here — with no team name to
		// print. The panel is a `dynamic({ ssr: false })` import behind its own read, so the mock's log is polled until the
		// read lands before the row is asserted (`s3-lane-a-home-0e.log` read it before the answer had arrived).
		await expect
			.poll(() => mock.calls('/invite/me').then((requests) => requests.length), { timeout: 25_000 })
			.toBeGreaterThanOrEqual(1);
		await expect
			.poll(() => invitationRows(page), { timeout: 25_000 })
			.toEqual([`${HOME.INVITATIONS} ${COMMON.ACCEPT}${COMMON.REJECT}`]);
		report('invitation rows on the no-team home', await invitationRows(page));

		// The shell mark stayed at its bootstrap half: `InitState` mounted, its critical reads never settled, so the page
		// never published `ever-teams:shell-ready` (`init-state.tsx:251-258`).
		const marksOf = () =>
			page.evaluate(() => window.performance.getEntriesByType('mark').map((entry) => entry.name));
		await expect
			.poll(marksOf, { message: 'the bootstrap mark is there', timeout: 25_000 })
			.toEqual(expect.arrayContaining(['ever-teams:shell-bootstrap-start']));
		await expect
			.poll(marksOf, { message: 'and the shell never became ready', timeout: 25_000 })
			.not.toContain('ever-teams:shell-ready');
		report('marks on the no-team home', await marksOf());

		expect(
			await mock.calls('/organization-team'),
			'the mock was never asked for a team: this file answered the empty list'
		).toEqual([]);
		expectAllowedHosts(traffic, 'the no-team home');
		expect(
			consoleFindings(shield),
			`the no-team home left findings: ${JSON.stringify(shield.consoleErrors())}`
		).toEqual([]);
		expect(shield.pageErrors(), 'the no-team home threw nothing').toEqual([]);
	});
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in manager sees and what the browser really sends on **Settings › Team › Automations**
 * (`/settings/team/automations`, `app/[locale]/(main)/settings/team/automations/page.tsx:1-5` →
 * `core/components/settings/pages/automations/automations-settings-page.tsx`), on lane-c (app `http://localhost:3033`,
 * mock `http://127.0.0.1:4002`, statistics `4003`, control `4004`, issuer `4005`, `playwright/test-servers.ts:40`).
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `E:\Coding\.tmp\probe-automations\probe.spec.ts` (P1-P6, P8), `probe2.spec.ts` (Q1-Q6),
 * `probe3.spec.ts` (R1-R5), `probe4.spec.ts` (S1-S3) and `probe5.spec.ts` (U1-U3), run on this lane on 2026-11-25 and
 * logged in `E:\Coding\.tmp\s3-lane-c-automations-probe-1.log` … `-probe-5.log`. Every value asserted below is one
 * those runs printed; this file's own `MEASURE` lines print the same shapes so a reader can check them.
 *
 * ## The switch, and what this file has to do to reach the page at all
 *
 * `AutomationsSettingsPage` refuses its own content before anything else: `automations-settings-page.tsx:307-315`
 * `if (!isTaskAutomationsEnabled()) return <AutomationsUnavailable />`, and `isTaskAutomationsEnabled()`
 * (`core/lib/utils/task-automations-enabled.ts:11-15`) is `NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED` read at run time
 * through `readRuntimeEnv` (`core/lib/utils/env-config.ts:104-110`), i.e. from the payload the server writes on
 * `<html data-ever-teams-runtime-env>`. **This lane does not set that key**: `playwright/test-servers.ts` `sharedEnv`
 * has no such entry and the lane app's `.env` has none, and the payload this lane's own app served carries 53 public
 * keys without it (test 1's `MEASURE` line prints the count and `flag: null`). Test 1 is the honest measurement of the
 * page **as the lane serves it**.
 *
 * To reach the manager UI at all, tests 2-18 load the page behind a test-side switch (`turnAutomationsOnHere`):
 * `globalThis.__EVER_TEAMS_RUNTIME_ENV__` becomes this file's property, holding the document's own payload plus
 * `NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED: 'true'` — exactly the global `env-config.ts:82-91` `readInjectedRuntimeEnv()`
 * consults before the `<html>` attribute — with a setter that refuses the layout's later `installRuntimeEnv(env)`
 * (`core/components/providers/runtime-env-provider.tsx:15-19`), which would otherwise put the server's payload back and
 * switch the page off mid-hydration. It is **a test-side flip of a deployment flag, not the app's configuration**: it
 * changes only what the browser's `readRuntimeEnv` readers see; the server's markup is untouched (no hydration error
 * appeared in any run), and components reading the RSC context (`useRuntimeEnvValue`) keep the server's values. The
 * lane's server may not be reconfigured from a spec (`playwright/scripts/lane-servers.mjs up/down` are not this file's
 * to run), which is why the flip lives in the browser.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock answers every task-automations route with its catch-all `return pagination([])`
 * (`cypress/support/mock-gauzy-server.mjs:897`, `pagination` at `:9`) = `{ items: [], total: 0 }`; it has **no** handler
 * for any of them (`mock.calls('/task-automations')` is empty in tests 1 and 3-18). Tests 1 and 2 run with **no stub**:
 * test 1 with the lane's own flag, test 2 with what that catch-all does to this page. NextAuth, the shell and its reads
 * (`/api/organization-team`, `/api/task-statuses`, `/api/task-priorities`, `/api/tags`, `/api/organization-projects`, …)
 * are the lane's, and the editor's pickers are filled from them for real: the statuses `open` and `in-progress`
 * (`mock-gauzy-server.mjs:156-182`), the project `Fixture Project`, the team's members, the team's task
 * `#1 Fixture active task`; the priorities and the labels answer `pagination([])` (`:338-341`), so those two pickers are
 * empty and the editor says `Nothing to choose from yet.`
 *
 * **Served by this file:** every task-automations answer, through `page.route` on the mock origin (the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360`): the templates, each list, each write. Every answer restates
 * the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`) because the page is on
 * `localhost:3033` and the API on `127.0.0.1:4002`. The list answer is always the current store, so a delete can be
 * followed by a re-read that no longer lists the rule, and a refused write changes nothing. `route.fetch()` is never
 * called, so `mock.calls('/task-automations')` stays empty in every stubbed test — the witness that the page acted on
 * this file and not on the mock.
 *
 * **The browser talks to the mock, never to the app's own route twins** (measured in `probe-1.log` P2 and `probe-2.log`
 * Q1): a load sent only `GET http://127.0.0.1:4002/api/task-automations/templates?organizationId=<fixture organization>`
 * and `GET http://127.0.0.1:4002/api/task-automations?organizationId=<…>`, and its app-origin calls were
 * `/api/auth/session`, `/api/health` and `POST /api/log` only. That is the lane's wiring (`test-servers.ts:318-335` with
 * `GAUZY_API_BASE_SERVER_URL` empty → the axios base is `<mock origin>/api`), so `app/api/task-automations/**` (proxy
 * mode) is not in this file's path; `suites/api` pins those routes.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/settings/pages/automations/automations-settings-page.tsx`: the gate `:307-315`; the availability
 *   branches `:257-290` (`off` and the fallback → `AutomationsUnavailable` `:297-304` with `UNAVAILABLE_TITLE` +
 *   `UNAVAILABLE_DESCRIPTION`; `available` → `AutomationsManager`; `loading` → the skeleton; `forbidden` →
 *   `FORBIDDEN_TITLE` + `FORBIDDEN_DESCRIPTION`; `error` → `ERROR_TITLE` + a `RETRY` button and **no** reason line);
 *   `AutomationsManager` `:114-252` — the `SettingsPage` header (`settings.entries.automations.TITLE` + `DESCRIPTION`)
 *   with the `NEW_RULE` action disabled at `TASK_AUTOMATION_LIMITS.rulesPerOrganization` `:174-179`, the `RULES` section
 *   with `RULES_DESCRIPTION` `:183`, skeleton / error `Notice` (`ERROR_TITLE` + the reason + `RETRY`) / empty `Notice`
 *   (`EMPTY_TITLE` + `EMPTY_DESCRIPTION`) / the list `:184-224`, and the five dialogs `:227-249`; `RuleRow` `:45-112` —
 *   the name, `<trigger>[ · MERGED_ONLY] → <actions>`, `scopeText` `:38-43` plus `LAST_RUN`/`NEVER_RAN` `:74-76`, then
 *   Move up / Move down / Edit / Test / History / Delete (aria-label `<verb>: <name>`, Move disabled at the ends `:90`,
 *   `:93`) and a `SettingsSwitch` named by `SWITCH_ARIA`; `fail()` `:127`, `save()` `:139-151`, `move()` `:153-160`,
 *   `remove()` `:162-172` (which keeps the reason *inside* the question dialog), `ConfirmDestructiveDialog` `:239-249`.
 * - `core/components/settings/pages/automations/automation-rule-editor.tsx` `:314-512`: name `Input` with
 *   `maxLength={TASK_AUTOMATION_LIMITS.nameLength}` `:337`, description `textarea` 2000 `:351`, Project/Team
 *   `OptionSelect`s with `ANY_PROJECT`/`ANY_TEAM`, the `ENABLED_LABEL` switch, the `WHEN` `TypeSelect` with its
 *   `TO_STATUSES`/`FROM_STATUSES` chip groups (or `MERGED_ONLY` + `MERGED_ONLY_HINT` for `LINK_CLOSED`), the `IF`/`THEN`
 *   blocks with `ADD_CONDITION`/`ADD_ACTION` disabled at 10 each, `ErrorLine` `:80-89` per item, the form-level
 *   `role=alert` `:496-500`, footer `CANCEL` + `CREATE`/`SAVE`; `save()` `:299-309` refuses while `errors.length` and
 *   otherwise hands the form to the page.
 * - `automation-pickers.tsx`: `useAutomationLookups` `:78-114` (statuses and priorities keyed by `value`, labels, the
 *   active team's members, projects, teams, `tasksByTeamState` as `#<number> <title>` `:71-80`), `ChipPicker` `:131-171`
 *   (`role=group` named by the field, one toggle button per value with `aria-pressed`, `NOTHING_TO_PICK` when empty),
 *   `OptionSelect` `:174-224`.
 * - `automation-dialogs.tsx`: `TRANSLATED_TEMPLATES` `:39-46` + `useTemplateText` `:49-56`, `AutomationTemplateDialog`
 *   `:59-102` (`CHOOSE_TEMPLATE`, `BLANK_RULE` + `BLANK_RULE_DESCRIPTION`, `FROM_TEMPLATE`, `NEEDS_INTEGRATION`),
 *   `AutomationTestDialog` `:155-260` (`TEST_TITLE`, `TEST_DESCRIPTION`, the `TEST_TASK` picker or `NO_TASKS`,
 *   `TEST_FAILED · <reason>` in a `role=alert`, `TEST_RUN` disabled until a task is picked), `AutomationRunsDialog`
 *   `:263-322` (`HISTORY_TITLE`, `LOADING`/`HISTORY_FAILED`/`HISTORY_EMPTY`, the runs with `OutcomeBadge`, footer
 *   `REFRESH` + `CLOSE`).
 * - `core/hooks/task-automations/use-task-automations.ts`: the availability probe `:71-87` (`GET
 *   /task-automations/templates?organizationId=…`, `staleTime` 5 min, retried only while `shouldRetryProbe` `:61-63` says
 *   so — for `error`, never for 403/404), `availabilityOfError` `:53-58` (404 → `unavailable`, 403 → `forbidden`, else
 *   `error`), the rules read `:92-102` (`GET /task-automations?…`, `sortTaskAutomationRules`
 *   `core/lib/utils/task-automations.ts:367-369` = `position` then `createdAt`, `staleTime` 15 s, no schema check), the
 *   runs read `:105-113` (asked only while the history is open, `limit=50`), and the writes `:133-268`: create
 *   `:173-181`, update `:183-211` (only a switch-only body is shown before the answer, and only that rule's switch goes
 *   back when it fails), reorder `:213-232` (the order goes back), remove `:234-241`, dry run `:243-246` (untracked), and
 *   `tracked` `:152-169`, which invalidates the rules once the last write of an organization settles **whether it
 *   succeeded or not** (measured: a refused create is followed by a list re-read).
 * - `core/services/client/api/task/automations/task-automations.service.ts` (`task-automations.service.ts`): `templates`
 *   `:28-33`, `list` `:36-39`, `create` `:41-44`, `update` `:46-49`, `reorder` `:52-55`, `remove` `:57-59` (no body),
 *   `test` `:62-65`, `runs` `:68-73`; `core/services/client/api.service.ts` adds `tenantId` to a write body (measured on
 *   the switch, the edit and the reorder, **not** on the create or the dry run). Nothing here validates an answer.
 * - `core/lib/utils/task-automations.ts`: `emptyTaskAutomationForm` `:183-199` (empty name, **`isEnabled: false`**,
 *   trigger `STATUS_CHANGED`, no condition, one `SET_STATUS` action with category `done`), `formFromRule` `:220-228`,
 *   `formFromTemplate` `:231-242`, `ruleInputFromForm` `:282-294` (trims, `description: … || null`, `templateKey` only
 *   when the form carries one), `validateTaskAutomationForm` `:323-364`, `moveRuleId` `:372-379`;
 *   `core/types/interfaces/common/task-automation.ts:201-211` `TASK_AUTOMATION_LIMITS` (100 rules, 10 conditions, 10
 *   actions, name 120, description 2000, message 1000).
 * - `core/lib/utils/error-feedback.ts:140-205`: the status → reason map behind every sentence read here (403 →
 *   `toasts.REASONS.PERMISSION`, 404 → `NOT_FOUND`, 500 → `SERVER`).
 * - `kit/team-settings-gate.tsx:19-56` (`ManagersOnly`: `settings.common.MANAGERS_ONLY_TITLE`,
 *   `MANAGERS_ONLY_DESCRIPTION` and a link to `settings.entries.teamGeneral.TITLE`) and
 *   `core/hooks/settings/use-hidden-settings-entries.ts:17-19` (`showsAutomationsEntry` = available | forbidden | error),
 *   entry `core/components/settings/kit/settings-entries.ts:82`.
 *
 * ## Findings
 *
 * - **With the switch on and no stub this page comes down.** The mock answers `GET /api/task-automations/templates` with
 *   its catch-all `{ items: [], total: 0 }` (`mock-gauzy-server.mjs:897`); `taskAutomationsService.templates` returns
 *   `response.data` as it is (`task-automations.service.ts:28-33`, no schema), the hook calls that `available`
 *   (`use-task-automations.ts:83`), and `AutomationTemplateDialog` runs `templates.map(...)` in its body
 *   (`automation-dialogs.tsx:84`) even while closed → the person lands on the app's error screen and the rules are never
 *   read. Measured (`probe-1.log` P2): 1 mock call (the templates read, 200), the console line `TypeError:
 *   templates.map is not a function at AutomationTemplateDialog`, no list read, the sidebar entry gone. The declared
 *   answer is `ITaskAutomationTemplate[]` (`task-automation.ts:187-198`), so it is the mock's object that violates it;
 *   what this file records is that a differently shaped answer is not caught the way `user-api-tokens.service.ts:26-30`
 *   catches one (no parse, no `Notice`, no retry). A hardening idea, not a claim about the product's API.
 * - **A refused create or delete raises two user-facing sentences at once.** The editor's own catch shows `SAVE_FAILED` +
 *   the reason (`automation-rule-editor.tsx:307`), and because `createMutation` and `removeMutation` have neither
 *   `onError` nor a `handlesOwnError` meta (`use-task-automations.ts:173-181`, `:234-241`), the global fallback
 *   `toasts.MUTATION_FAILED` ("That change was not saved") + the same reason appears beside it
 *   (`core/components/common/mutation-error-toaster.tsx:23-30,53-56`). Measured (`probe-2.log` Q4): three toasts for one
 *   refused create (`The automation could not be saved …`, the dev-only `DEV Mutation failed …`, `That change was not
 *   saved …`); for a refused 404 delete the fallback sentence plus the reason *inside* the still-open question dialog
 *   (`automations-settings-page.tsx:162-172`, `kit/danger.tsx:165-169`). A refused switch and a refused reorder show one
 *   sentence each (`TOGGLE_FAILED`, `REORDER_FAILED`): those two mutations do have `onError` (`:195-203`, `:222-226`),
 *   which is what the fallback toaster checks.
 * - **`TOO_MANY_CONDITIONS`, `TOO_MANY_ACTIONS`, `NAME_TOO_LONG`, `DESCRIPTION_TOO_LONG` and `MESSAGE_TOO_LONG` are
 *   unreachable through this editor** (reachability note, not a defect): `validateTaskAutomationForm` returns them
 *   (`task-automations.ts:327-331`, `:359-361`) and the copy exists, but the fields cap the input first — `maxLength` 120
 *   / 2000 / 1000 (`automation-rule-editor.tsx:337`, `:351`, `:234`; measured `maxlength="120"`/`"2000"`, and 121 typed
 *   characters leave 120 in the field) and both add-buttons are `disabled` at 10 items (`:467`, `:490`).
 * - **`RuleRow` prints a next-intl console error for every rule that has a `lastRunAt`** (and the history dialog does the
 *   same for its runs): `format.relativeTime(…)` is called without the `now` argument (`automations-settings-page.tsx:75`,
 *   `automation-dialogs.tsx:288`) and next-intl logs `IntlError: ENVIRONMENT_FALLBACK: The \`now\` parameter wasn't
 *   provided to \`relativeTime\` …` while still rendering the sentence (`Last run 2 days ago`, measured). Test 5 excuses
 *   only that named line and prints it in its `MEASURE` line; every other console error still fails this file.
 * - **A row's switch keeps the accessible name `… is on` whatever it shows** (`automations-settings-page.tsx:108`,
 *   `SWITCH_ARIA` = `"{name} is on"`): measured on a served `isEnabled: false` rule — `aria-checked="false"` with the
 *   name `Probe second is on`. No comment, type or unit test states another intent, so this is recorded as what the row
 *   does; the state a screen reader is told is the `aria-checked` value.
 * - **A failing read is read again, a failing availability probe of a 403/404 is not** (measured `probe-4.log` S3): a
 *   refused list produced 2 reads of `GET /task-automations`, a refused templates read of 500 produced 3 (TanStack
 *   Query's own retries; `use-task-automations.ts:71-87` and `:92-102` keep the defaults, `shouldRetryProbe` `:61-63`
 *   stops the probe at 403/404). Read counts are therefore pinned only as "more than one".
 * - **A person the gate refuses is asked nothing** (measured `probe-3.log` R1): with `manager: false` the page renders
 *   `ManagersOnly` — no `<h1>`, no Rules section, no `New rule` — and **no task-automations call went out at all**, and
 *   the sidebar's own entry was gone too: `useHiddenSettingsEntries` asks the availability question only for an entry it
 *   would show (`:17-19`).
 *
 * ## What this file does not cover
 *
 * - Proxy mode `app/api/task-automations/**` (see "Which layer is real").
 * - The platform's own rules: there is no real Gauzy here, so a 403/404/500 is *imitated* by this file and what is pinned
 *   is the app's answer to it, not the platform's reason.
 * - A *successful* dry run's four sections (`TEST_TRIGGER`/`TEST_CONDITIONS`/`TEST_CHANGES`/`TEST_OUTCOME`,
 *   `automation-dialogs.tsx:223-248`) and the outcome badges: test 18 pins the picker, the disabled run button, the exact
 *   dry-run body and the refused dry run's sentence.
 * - Writes across an organization switch (`WriteScope`, `use-task-automations.ts:119-131`), the platform's loop guard and
 *   rate limiting, and saving `MERGED_ONLY` (unit test `automation-rule-editor.test.tsx:95-120`).
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const PAGE_PATH = '/settings/team/automations';
const ROUTE = '/api/task-automations';
const TEMPLATES_ROUTE = '/api/task-automations/templates';
const ORDER_ROUTE = '/api/task-automations/order';
/** The same paths as the client's own log line names them: its axios base already carries `/api` (`logger-adapter.service.ts:189-198`). */
const LOGGED_ROUTE = '/task-automations';
const LOGGED_TEMPLATES_ROUTE = '/task-automations/templates';
const LOGGED_ORDER_ROUTE = '/task-automations/order';

/** `locales/en.json`: `settings.automations` (its 103 keys with the `triggers`/`conditions`/`actions`/`categories`/`outcomes`/`errors`/`templates` maps), `settings.entries.automations`, `settings.common`, `common`, `toasts`. */
type AutomationsCopy = Record<string, string> & {
	triggers: Record<string, string>;
	actions: Record<string, string>;
	errors: Record<string, string>;
	outcomes: Record<string, string>;
	templates: Record<string, { NAME: string; DESCRIPTION: string }>;
};
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	settings: {
		automations: AutomationsCopy;
		entries: { automations: { TITLE: string; DESCRIPTION: string }; teamGeneral: { TITLE: string } };
		common: { MANAGERS_ONLY_TITLE: string; MANAGERS_ONLY_DESCRIPTION: string };
	};
	common: { CANCEL: string; CLOSE: string };
	toasts: { REASONS: Record<string, string>; MUTATION_FAILED: string };
};
const T = EN.settings.automations;
const R = EN.toasts.REASONS;
const PAGE_TITLE = EN.settings.entries.automations.TITLE; // Automations
/** `SWITCH_ARIA` = "{name} is on", `SCOPE_PROJECT` = "Project: {name}", `TEST_TITLE` = "Test {name}", `HISTORY_TITLE` = "History of {name}". */
const filled = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), T[key]);

const report = (label: string, value: unknown) =>
	console.log(`[lane-c automations] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** `ITaskAutomationRule` (`task-automation.ts:106-124`) as this file serves it. */
type ServedRule = {
	id: string;
	name: string;
	description: string | null;
	projectId: string | null;
	organizationTeamId: string | null;
	isEnabled: boolean;
	position: number;
	templateKey: string | null;
	trigger: { type: string; toStatuses?: string[]; fromStatuses?: string[]; mergedOnly?: boolean };
	conditions: Array<{ type: string; values?: string[]; text?: string }>;
	actions: Array<{
		type: string;
		category?: string;
		status?: string;
		priority?: string;
		employeeIds?: string[];
		tagIds?: string[];
		message?: string;
	}>;
	lastRunAt: string | null;
	createdAt: string;
	updatedAt: string;
};

/** A refusal this file arms on the fake platform. `delayMs` holds the answer back, so an optimistic state can be seen before it rolls back. */
type Refusal = { status: number; message?: string; delayMs?: number };

type ServedScript = {
	rules?: ServedRule[];
	templates?: unknown[];
	runs?: unknown[];
	templatesRefusal?: Refusal;
	listRefusal?: Refusal;
	createRefusal?: Refusal;
	updateRefusal?: Refusal;
	orderRefusal?: Refusal;
	removeRefusal?: Refusal;
	runsRefusal?: Refusal;
	testRefusal?: Refusal;
};

type ServedCall = { method: string; path: string; search: string; body: string | null; url: string };

type AutomationsHarness = {
	calls: ServedCall[];
	/** The rules this file's fake platform holds: a create adds, a delete removes, a refusal changes nothing. */
	items: ServedRule[];
	shapes: () => string[];
	countOf: (method: string, path: string) => number;
	pathOf: (id: string) => string;
};

/**
 * This file's stand-in for the platform's task automations, on the mock origin, because the mock has no handler for any
 * of it (see the header). The list answer is always the current store, so a delete can be followed by a re-read that no
 * longer lists the rule — the only way to tell "the row is gone" apart from "the platform still says it exists".
 */
async function serveAutomations(page: Page, initial: ServedScript): Promise<AutomationsHarness> {
	const store = { rules: [...(initial.rules ?? [])] };
	const calls: ServedCall[] = [];
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(ROUTE);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		calls.push({ method, path: url.pathname, search: url.search, body: request.postData(), url: request.url() });
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});
		const answerRefusal = async (item: Refusal) => {
			if (item.delayMs) await new Promise((resolve) => setTimeout(resolve, item.delayMs));
			return answer(item.status, {
				statusCode: item.status,
				message: item.message ?? 'this file refused the call'
			});
		};

		if (url.pathname === TEMPLATES_ROUTE) {
			if (initial.templatesRefusal) return answerRefusal(initial.templatesRefusal);
			return answer(200, initial.templates ?? []);
		}
		if (url.pathname === ORDER_ROUTE && method === 'PUT') {
			if (initial.orderRefusal) return answerRefusal(initial.orderRefusal);
			const ids = (JSON.parse(String(request.postData())).ids ?? []) as string[];
			const byId = new Map(store.rules.map((rule) => [rule.id, rule]));
			store.rules = [
				...ids.map((id) => byId.get(id)).filter((rule): rule is ServedRule => !!rule),
				...store.rules.filter((rule) => !ids.includes(rule.id))
			].map((rule, position) => ({ ...rule, position }));
			return answer(200, store.rules);
		}
		if (url.pathname === ROUTE && method === 'GET') {
			if (initial.listRefusal) return answerRefusal(initial.listRefusal);
			return answer(200, store.rules);
		}
		if (url.pathname === ROUTE && method === 'POST') {
			if (initial.createRefusal) return answerRefusal(initial.createRefusal);
			const created: ServedRule = {
				id: `bbbb0000-0000-4000-8000-000000000${String(store.rules.length + 10).padStart(2, '0')}`,
				description: null,
				projectId: null,
				organizationTeamId: null,
				templateKey: null,
				lastRunAt: null,
				position: store.rules.length,
				createdAt: dayIso(0),
				updatedAt: dayIso(0),
				...JSON.parse(String(request.postData()))
			};
			store.rules = [...store.rules, created];
			return answer(201, created);
		}
		const [id, sub] = (url.pathname.startsWith(`${ROUTE}/`) ? url.pathname.slice(ROUTE.length + 1) : '').split('/');
		if (sub === 'test' && method === 'POST') {
			if (initial.testRefusal) return answerRefusal(initial.testRefusal);
			return answer(200, {
				ruleId: id,
				taskId: '',
				subjectTaskId: '',
				triggerMatches: null,
				conditions: [],
				changes: [],
				outcome: 'NO_CHANGE'
			});
		}
		if (sub === 'runs' && method === 'GET') {
			if (initial.runsRefusal) return answerRefusal(initial.runsRefusal);
			return answer(200, initial.runs ?? []);
		}
		if (id && method === 'PUT') {
			if (initial.updateRefusal) return answerRefusal(initial.updateRefusal);
			store.rules = store.rules.map((rule) =>
				rule.id === id ? { ...rule, ...JSON.parse(String(request.postData())) } : rule
			);
			return answer(
				200,
				store.rules.find((rule) => rule.id === id)
			);
		}
		if (id && method === 'DELETE') {
			if (initial.removeRefusal) return answerRefusal(initial.removeRefusal);
			store.rules = store.rules.filter((rule) => rule.id !== id);
			return answer(204);
		}
		return answer(599, { message: `this file scripted no answer for ${method} ${url.pathname}` });
	});

	return {
		calls,
		get items() {
			return store.rules;
		},
		shapes: () =>
			calls.map(
				(call) => `${call.method} ${call.path}${call.search}${call.body === null ? '' : ` ${call.body}`}`
			),
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		pathOf: (id) => `${ROUTE}/${id}`
	};
}

/** Only records: what the browser really sent, split by origin. Nothing is answered here. */
function recordBrowserCalls(page: Page) {
	const mockCalls: Array<{ method: string; path: string; search: string }> = [];
	const appCalls: Array<{ method: string; path: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(ROUTE)) {
			mockCalls.push({ method: request.method(), path: url.pathname, search: url.search });
		}
		if (url.origin === APP_ORIGIN && url.pathname.startsWith('/api/')) {
			appCalls.push({ method: request.method(), path: url.pathname });
		}
	});
	return { mockCalls, appCalls };
}

/**
 * The test-side deployment switch (see the header): owns `env-config.ts`'s runtime-env global, holding the document's own
 * payload plus `NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED: 'true'`, and refuses the layout provider's later re-install of the
 * server's payload. Nothing else in the payload is touched.
 */
async function turnAutomationsOnHere(page: Page) {
	await page.addInitScript(() => {
		const KEY = '__EVER_TEAMS_RUNTIME_ENV__';
		const ATTRIBUTE = 'data-ever-teams-runtime-env';
		const FLAG = 'NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED';
		let cached: Record<string, string> | null = null;
		const view = () => {
			if (cached) return cached;
			const raw = document.documentElement?.getAttribute(ATTRIBUTE) ?? '';
			let base: Record<string, string> = {};
			try {
				base = raw ? (JSON.parse(raw) as Record<string, string>) : {};
			} catch {
				base = {};
			}
			cached = { ...base, [FLAG]: 'true' };
			return cached;
		};
		Object.defineProperty(globalThis, KEY, {
			configurable: true,
			enumerable: false,
			get: () => view(),
			set: () => undefined
		});
	});
}

/** React's dev-mode store warning, not this page's (see `suites/lane-a/api-tokens-settings-ui.spec.ts:366-372`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-45` prints this for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** next-intl's own warning for `format.relativeTime` called without `now` (see the findings). */
const RELATIVE_TIME_NOISE = 'IntlError: ENVIRONMENT_FALLBACK';
/** The client's own line for a refusal this file armed. A 403 is logged as a "CRITICAL" sentence instead of `HTTP Error:`. */
const armedHttpError = (verb: string, path: string, status: number) =>
	status === 403
		? `[ERROR] [HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - ${verb} ${path} - Permission Denied`
		: `[ERROR] [HttpClient] HTTP Error: ${verb} ${path} ${status}`;

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !line.includes(RELATIVE_TIME_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** A served date at local noon, so a rendered relative time cannot straddle a day boundary. */
const dayIso = (offsetDays: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day.toISOString();
};

const ruleOf = (id: string, name: string, overrides: Partial<ServedRule> = {}): ServedRule => ({
	id,
	name,
	description: null,
	projectId: null,
	organizationTeamId: null,
	isEnabled: true,
	position: 0,
	templateKey: null,
	trigger: { type: 'STATUS_CHANGED', toStatuses: [], fromStatuses: [] },
	conditions: [],
	actions: [{ type: 'SET_STATUS', category: 'done' }],
	lastRunAt: null,
	createdAt: dayIso(-10),
	updatedAt: dayIso(-10),
	...overrides
});

/** What a copy element must say, wherever it sits (a `Page` or a dialog `Locator`). */
type TextScope = { getByText: (text: string, options?: { exact?: boolean }) => Locator };
type NodeScope = TextScope & { locator: (selector: string) => Locator };

const organizationIdOf = (fixture: BootstrapFixture) => fixture.ids.organizationA;
const tenantIdOf = (fixture: BootstrapFixture) => fixture.ids.tenantA;
/** The settings column only (the `SETTINGS_COLUMN` div holding the header and the sections), never the shell chrome. */
const settingsArea = (page: Page) =>
	page.getByRole('heading', { level: 1, name: PAGE_TITLE, exact: true }).locator('xpath=../../..');
const ruleRows = (page: Page) => settingsArea(page).locator('ul > li');
const ruleNames = async (page: Page) =>
	ruleRows(page).evaluateAll((nodes) => nodes.map((node) => node.querySelector('span')?.textContent?.trim() ?? ''));
const rowTexts = async (page: Page) =>
	ruleRows(page)
		.allInnerTexts()
		.then((all) => all.map(flat));
const sentence = (scope: TextScope, value: string) => scope.getByText(value, { exact: true });
const noticeTexts = async (scope: NodeScope) =>
	scope
		.locator('output')
		.allInnerTexts()
		.then((all) => all.map(flat));
const devToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: 'Copy details' });
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' });
const toastTexts = async (page: Page) =>
	appToasts(page)
		.allInnerTexts()
		.then((all) => all.map(flat));
const switchStates = async (page: Page) =>
	page.locator('[role=switch]').evaluateAll((nodes) =>
		nodes.map((node) => ({
			checked: node.getAttribute('aria-checked'),
			label: node.getAttribute('aria-label')
		}))
	);
const moveButtonStates = async (page: Page) =>
	page.locator('button[aria-label^="Move"]').evaluateAll((nodes) =>
		nodes.map((node) => ({
			label: node.getAttribute('aria-label'),
			disabled: (node as HTMLButtonElement).disabled
		}))
	);
const settingsNavEntry = (page: Page) =>
	page
		.getByRole('navigation', { name: 'Settings', exact: true })
		.getByRole('link', { name: PAGE_TITLE, exact: true });
const dialogOf = (page: Page) => page.getByRole('dialog');
const rulesHeading = (page: Page) => page.getByRole('heading', { level: 2, name: T.RULES, exact: true });
const newRuleButton = (page: Page) => page.getByRole('button', { name: T.NEW_RULE, exact: true });
const rowButton = (page: Page, verb: string, name: string) =>
	page.getByRole('button', { name: `${verb}: ${name}`, exact: true });

/** `New rule` → the chooser → `Blank rule` → the empty editor (`AutomationsManager:131-137` → `pick(null)`). */
async function openBlankEditor(page: Page) {
	await newRuleButton(page).click();
	const chooser = dialogOf(page);
	await expect(
		chooser.getByRole('heading', { name: T.CHOOSE_TEMPLATE, exact: true }),
		'the chooser never opened'
	).toBeVisible();
	await chooser.getByRole('button').filter({ hasText: T.BLANK_RULE }).click();
	const editor = dialogOf(page);
	await expect(editor.getByRole('heading', { name: T.EDITOR_CREATE_TITLE, exact: true })).toBeVisible();
	return editor;
}

test.describe('lane-c · Settings › Team › Automations: what the page shows and what the browser sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ---------------------------------------------------------------- 1. the lane exactly as it is: the switch is off

	test('1 · the lane as it is: automations are off, so the page says they are not available and asks nothing of the mock', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(settingsArea(page), 'Settings › Team › Automations rendered no page header').toBeVisible({
			timeout: 25_000
		});
		// AutomationsSettingsPage:307 (!isTaskAutomationsEnabled()) → AutomationsUnavailable :297-304
		await expect(sentence(page, T.UNAVAILABLE_TITLE)).toBeVisible();
		await expect(sentence(page, T.UNAVAILABLE_DESCRIPTION)).toBeVisible();
		await expect(
			await noticeTexts(settingsArea(page)),
			'the notice is not the title + description the page builds'
		).toEqual([`${T.UNAVAILABLE_TITLE} ${T.UNAVAILABLE_DESCRIPTION}`]);
		await expect(rulesHeading(page), 'the Rules section was drawn although automations are off').toHaveCount(0);
		await expect(newRuleButton(page), 'New rule was offered although automations are off').toHaveCount(0);
		await expect(
			sentence(page, T.EMPTY_TITLE),
			'the empty card appeared on a page with no automations'
		).toHaveCount(0);
		await expect(
			settingsNavEntry(page),
			'the sidebar lists Automations while the deployment has them off'
		).toHaveCount(0);

		// nothing at all was asked of the platform (use-task-automations.ts:77 `enabled: enabled && …`)
		await expect.poll(() => calls.mockCalls.length, { timeout: 10_000 }).toBe(0);
		expect(
			calls.appCalls.map((call) => call.path),
			'a task-automations call went to a Next route'
		).not.toContain(ROUTE);
		expect((await mock.calls(ROUTE)).length, 'the mock heard a task-automations call').toBe(0);

		const payload = await page.evaluate(() => {
			const raw = document.documentElement.getAttribute('data-ever-teams-runtime-env') ?? '';
			const env = raw ? (JSON.parse(raw) as Record<string, string>) : {};
			return { keys: Object.keys(env).length, flag: env.NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED ?? null };
		});
		report('lane-as-it-is', {
			heading: await settingsArea(page).locator('h1').innerText(),
			notice: await noticeTexts(settingsArea(page)),
			runtimeEnvPayload: payload,
			browserMockCalls: calls.mockCalls,
			appApiCalls: [...new Set(calls.appCalls.map((call) => `${call.method} ${call.path}`))],
			navEntry: await settingsNavEntry(page).count(),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(payload.flag, 'the lane really does leave the flag out').toBeNull();
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------------------------------------- 2. switch on, no stub

	test('2 · the switch on and no stub: the mock answers the templates with a pagination object and the page comes down', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		// the catch-all answered 200 with {items:[],total:0} (mock-gauzy-server.mjs:897) → availability 'available' (:83)
		await expect
			.poll(() => calls.mockCalls.map((call) => `${call.method} ${call.path}`).join(','), { timeout: 15_000 })
			.toBe(`GET ${TEMPLATES_ROUTE}`);
		expect(
			(await mock.calls(ROUTE)).map((request) => [request.method, request.path, request.status]),
			'the mock did not answer its own catch-all'
		).toEqual([['GET', TEMPLATES_ROUTE, 200]]);
		expect(
			calls.mockCalls.some((call) => call.path === ROUTE),
			'the rules were read although the page came down'
		).toBe(false);

		// AutomationTemplateDialog:84 runs templates.map(...) on an object, even while closed
		await expect(sentence(page, 'Something went wrong')).toBeVisible({ timeout: 25_000 });
		await expect(newRuleButton(page), 'the manager UI survived the crash').toHaveCount(0);
		await expect(settingsNavEntry(page), 'the sidebar kept the entry of a page that crashed').toHaveCount(0);
		const crash = shield.consoleErrors().filter((line) => line.includes('templates.map is not a function'));
		expect(crash.length, 'the crash this case exists to pin was not logged').toBeGreaterThanOrEqual(1);
		expect(crash[0], 'the crash is not the one the template dialog raises').toContain('AutomationTemplateDialog');

		report('switch-on-no-stub', {
			browserMockCalls: calls.mockCalls,
			mockLogged: (await mock.calls(ROUTE)).map((item) => `${item.method} ${item.path} ${item.status}`),
			errorScreen: flat(await page.locator('body').innerText()).slice(-260),
			crashLine: crash[0]?.slice(0, 120) ?? null,
			consoleErrorCount: shield.consoleErrors().length,
			pageErrors: shield.pageErrors()
		});
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------------------------------------- 3. served platform, no rule

	test('3 · the switch on with a served platform that has no rule: the empty notice, the sidebar entry, exactly two reads', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const served = await serveAutomations(page, { templates: [], rules: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(settingsArea(page)).toBeVisible({ timeout: 25_000 });
		await expect(sentence(page, EN.settings.entries.automations.DESCRIPTION)).toBeVisible();
		await expect(rulesHeading(page)).toBeVisible();
		await expect(sentence(page, T.RULES_DESCRIPTION)).toBeVisible();
		// !isLoading && !isError && rules.length === 0 → Notice(EMPTY_TITLE, EMPTY_DESCRIPTION) (:197-199)
		await expect(sentence(page, T.EMPTY_TITLE)).toBeVisible();
		await expect(sentence(page, T.EMPTY_DESCRIPTION)).toBeVisible();
		await expect(await noticeTexts(settingsArea(page)), 'the empty notice is not the copy the page builds').toEqual(
			[`${T.EMPTY_TITLE} ${T.EMPTY_DESCRIPTION}`]
		);
		await expect(ruleRows(page), 'an empty list drew a row').toHaveCount(0);
		await expect(newRuleButton(page)).toHaveCount(1);
		await expect(newRuleButton(page)).toBeEnabled();
		await expect(
			sentence(page, T.UNAVAILABLE_TITLE),
			'a platform that answered was called unavailable'
		).toHaveCount(0);
		await expect(sentence(page, T.ERROR_TITLE), 'a platform that answered was called a failure').toHaveCount(0);
		await expect(
			settingsNavEntry(page),
			'the sidebar hides the entry of a platform that has automations'
		).toHaveCount(1);

		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([
				`GET ${TEMPLATES_ROUTE}?organizationId=${organizationIdOf(fixture)}`,
				`GET ${ROUTE}?organizationId=${organizationIdOf(fixture)}`
			]);
		expect((await mock.calls(ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('served-empty', {
			area: flat(await settingsArea(page).innerText()),
			navEntry: await settingsNavEntry(page).count(),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 4. a served list of three

	test('4 · a served list of three: position order, what each row says, its six controls and its switch', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const second = ruleOf('bbbb0000-0000-4000-8000-000000000021', 'Probe second', {
			position: 0,
			isEnabled: false,
			createdAt: dayIso(-20)
		});
		const newest = ruleOf('bbbb0000-0000-4000-8000-000000000022', 'Probe newest', {
			position: 1,
			createdAt: dayIso(-2)
		});
		const merged = ruleOf('bbbb0000-0000-4000-8000-000000000023', 'Probe merged', {
			position: 2,
			createdAt: dayIso(-7),
			projectId: 'cccc0000-0000-4000-8000-0000000000c1',
			trigger: { type: 'LINK_CLOSED', mergedOnly: true },
			actions: [{ type: 'NOTIFY_ASSIGNEES', message: 'look at it' }]
		});
		// served out of position order on purpose: sortTaskAutomationRules (task-automations.ts:367-369) decides the rows
		const served = await serveAutomations(page, { templates: [], rules: [merged, newest, second] });
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });
		await expect
			.poll(() => ruleNames(page), { timeout: 15_000 })
			.toEqual(['Probe second', 'Probe newest', 'Probe merged']);
		// RuleRow:70-76: the name, `<trigger> → <actions>`, `<scope> · <lastRun>`; :68-69 appends the merged-only note
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([
				`Probe second ${T.triggers.STATUS_CHANGED} → ${T.actions.SET_STATUS} ${T.SCOPE_ORGANIZATION} · ${T.NEVER_RAN}`,
				`Probe newest ${T.triggers.STATUS_CHANGED} → ${T.actions.SET_STATUS} ${T.SCOPE_ORGANIZATION} · ${T.NEVER_RAN}`,
				`Probe merged ${T.triggers.LINK_CLOSED} · ${T.MERGED_ONLY} → ${T.actions.NOTIFY_ASSIGNEES} ${filled('SCOPE_PROJECT', { name: '—' })} · ${T.NEVER_RAN}`
			]);
		await expect(sentence(page, T.EMPTY_TITLE), 'a list of three drew the empty notice').toHaveCount(0);
		await expect(sentence(page, T.ERROR_TITLE), 'a list that answered drew the failure notice').toHaveCount(0);

		for (const name of ['Probe second', 'Probe newest', 'Probe merged']) {
			for (const verb of [T.MOVE_UP, T.MOVE_DOWN, T.EDIT, T.TEST, T.HISTORY, T.DELETE]) {
				await expect(rowButton(page, verb, name), `${verb}: ${name} is missing`).toHaveCount(1);
			}
		}
		// :90 and :93 disable Move up on the first row and Move down on the last one
		const moves = await moveButtonStates(page);
		expect(moves.slice(0, 2), 'the first row may move up').toEqual([
			{ label: `${T.MOVE_UP}: Probe second`, disabled: true },
			{ label: `${T.MOVE_DOWN}: Probe second`, disabled: false }
		]);
		expect(moves.slice(-2), 'the last row may move down').toEqual([
			{ label: `${T.MOVE_UP}: Probe merged`, disabled: false },
			{ label: `${T.MOVE_DOWN}: Probe merged`, disabled: true }
		]);
		// :108 aria-checked carries the state; SWITCH_ARIA names the row the same way whatever it shows
		expect(await switchStates(page), 'the row switches are not the three SettingsSwitch builds').toEqual([
			{ checked: 'false', label: filled('SWITCH_ARIA', { name: 'Probe second' }) },
			{ checked: 'true', label: filled('SWITCH_ARIA', { name: 'Probe newest' }) },
			{ checked: 'true', label: filled('SWITCH_ARIA', { name: 'Probe merged' }) }
		]);

		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([
				`GET ${TEMPLATES_ROUTE}?organizationId=${organizationIdOf(fixture)}`,
				`GET ${ROUTE}?organizationId=${organizationIdOf(fixture)}`
			]);
		expect((await mock.calls(ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('served-list', {
			order: await ruleNames(page),
			rows: await rowTexts(page),
			switches: await switchStates(page),
			moves: await moveButtonStates(page),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 5. a rule that has run

	test('5 · a rule that has run: the Last run line, and the next-intl error the row itself raises', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const ran = ruleOf('bbbb0000-0000-4000-8000-000000000031', 'Ran recently', {
			position: 0,
			lastRunAt: dayIso(-2),
			createdAt: dayIso(-2)
		});
		const served = await serveAutomations(page, { templates: [], rules: [ran] });
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });
		// RuleRow:74-76 LAST_RUN over format.relativeTime; two days keeps the wording off a rounding edge
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([
				`Ran recently ${T.triggers.STATUS_CHANGED} → ${T.actions.SET_STATUS} ${T.SCOPE_ORGANIZATION} · Last run 2 days ago`
			]);
		await expect(sentence(page, T.NEVER_RAN)).toHaveCount(0);

		const relativeTimeLines = shield.consoleErrors().filter((line) => line.includes(RELATIVE_TIME_NOISE));
		expect(
			relativeTimeLines.length,
			'the row did not raise the next-intl line this test exists to pin'
		).toBeGreaterThanOrEqual(1);
		expect(relativeTimeLines[0]).toContain('relativeTime');
		expect(consoleFindings(shield), 'besides the relativeTime line the page logged a console error').toEqual([]);
		expect(served.countOf('PUT', served.pathOf(ran.id)), 'reading a list wrote something').toBe(0);

		report('last-run', {
			row: (await rowTexts(page))[0],
			relativeTimeLineCount: relativeTimeLines.length,
			relativeTimeLine: relativeTimeLines[0]?.slice(0, 120) ?? null,
			calls: served.shapes()
		});
	});

	// ---------------------------------------------------------------- 6. New rule and the chooser

	test('6 · New rule: the chooser offers a blank rule and the templates, translating the keys it knows', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const known = {
			key: 'assigned-moves-in-progress',
			name: 'platform english name',
			description: 'platform english description',
			trigger: { type: 'TASK_ASSIGNED' },
			conditions: [{ type: 'STATUS_CATEGORY_IS', values: ['todo'] }],
			actions: [{ type: 'SET_STATUS', category: 'in_progress' }]
		};
		const unknown = {
			key: 'probe-untranslated-template',
			name: 'Platform only template',
			description: 'Only the platform has words for this one.',
			trigger: { type: 'TASK_CREATED' },
			conditions: [],
			actions: [{ type: 'NOTIFY_ASSIGNEES' }]
		};
		const needsIntegration = { ...known, key: 'link-closed-sets-status', requiresIntegration: true };
		const served = await serveAutomations(page, { templates: [known, unknown, needsIntegration], rules: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });

		await newRuleButton(page).click();
		const chooser = dialogOf(page);
		await expect(chooser.getByRole('heading', { name: T.CHOOSE_TEMPLATE, exact: true })).toBeVisible();
		await expect(sentence(chooser, T.BLANK_RULE)).toBeVisible();
		await expect(sentence(chooser, T.BLANK_RULE_DESCRIPTION)).toBeVisible();
		await expect(sentence(chooser, T.FROM_TEMPLATE)).toBeVisible();
		// useTemplateText (automation-dialogs.tsx:49-56): TRANSLATED_TEMPLATES by key, the platform's English otherwise
		const chooserText = flat(await chooser.innerText());
		expect(chooserText, 'a template the app has strings for kept the platform English').toContain(
			T.templates['assigned-moves-in-progress'].NAME
		);
		expect(chooserText).toContain(T.templates['assigned-moves-in-progress'].DESCRIPTION);
		expect(chooserText, 'a template the app has no strings for was dropped').toContain(unknown.name);
		expect(chooserText).toContain(unknown.description);
		expect(chooserText).toContain(T.templates['link-closed-sets-status'].NAME);
		const needsIntegrationCount = await sentence(chooser, T.NEEDS_INTEGRATION).count();
		expect(needsIntegrationCount, 'a requiresIntegration template said nothing about it').toBe(1);

		await chooser.getByRole('button').filter({ hasText: T.BLANK_RULE }).click();
		const editor = dialogOf(page);
		await expect(editor.getByRole('heading', { name: T.EDITOR_CREATE_TITLE, exact: true })).toBeVisible();
		// `chooser` is a live locator, so "the chooser closed" is told by its own heading being gone
		await expect(
			page.getByRole('heading', { name: T.CHOOSE_TEMPLATE, exact: true }),
			'the chooser stayed open behind the editor'
		).toHaveCount(0);
		expect(served.countOf('POST', ROUTE), 'opening a dialog wrote something').toBe(0);
		await editor.getByRole('button', { name: T.CANCEL, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);

		report('template-chooser', {
			chooser: chooserText,
			needsIntegrationCount,
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 7. the editor's own checks run before anything is sent

	test('7 · the blank editor: its fields and their caps, and a save it refuses before sending', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const served = await serveAutomations(page, { templates: [], rules: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });

		const editor = await openBlankEditor(page);
		await expect(sentence(editor, T.NAME)).toBeVisible();
		await expect(sentence(editor, T.DESCRIPTION)).toBeVisible();
		await expect(sentence(editor, T.ANY_PROJECT)).toBeVisible();
		await expect(sentence(editor, T.ANY_TEAM)).toBeVisible();
		await expect(sentence(editor, T.ENABLED_LABEL)).toBeVisible();
		await expect(sentence(editor, T.ANY_STATUS)).toBeVisible();
		await expect(sentence(editor, T.NO_CONDITIONS)).toBeVisible();
		await expect(sentence(editor, T.ADD_CONDITION)).toBeVisible();
		await expect(sentence(editor, T.ADD_ACTION)).toBeVisible();
		await expect(editor.getByRole('button', { name: T.CANCEL, exact: true })).toHaveCount(1);
		await expect(editor.getByRole('button', { name: T.CREATE, exact: true })).toHaveCount(1);
		// a blank rule's WHEN is a status change (task-automations.ts:186), so the chip groups show the mock's own statuses
		await expect(editor.getByRole('group', { name: T.TO_STATUSES, exact: true })).toBeVisible();
		await expect(editor.getByRole('group', { name: T.FROM_STATUSES, exact: true })).toBeVisible();
		await expect(editor.getByRole('button', { name: 'open', exact: true })).toHaveCount(2);
		await expect(editor.getByRole('button', { name: 'in-progress', exact: true })).toHaveCount(2);
		// emptyTaskAutomationForm:189-190 → a blank rule starts switched off
		await expect(editor.getByRole('switch', { name: T.ENABLED_LABEL, exact: true })).not.toBeChecked();

		const nameField = editor.getByRole('textbox').first();
		const caps = await nameField.evaluate((node) => ({
			nameMaxLength: (node as HTMLInputElement).getAttribute('maxlength'),
			nameValueLength: (node as HTMLInputElement).value.length,
			descriptionMaxLength: document.querySelector('textarea')?.getAttribute('maxlength')
		}));
		expect(caps, 'the editor fields are not the capped ones automation-rule-editor.tsx:337,:351 builds').toEqual({
			nameMaxLength: '120',
			nameValueLength: 0,
			descriptionMaxLength: '2000'
		});

		// a blank form is refused by the client's own check (validateTaskAutomationForm:327 NAME_REQUIRED); nothing is sent
		await editor.getByRole('button', { name: T.CREATE, exact: true }).click();
		await expect(editor.getByRole('alert').first()).toContainText(T.errors.NAME_REQUIRED);
		await expect(nameField).toHaveAttribute('aria-invalid', 'true');
		await expect(dialogOf(page), 'the editor closed on a form it refused').toHaveCount(1);
		expect(
			served.shapes().filter((shape) => !shape.startsWith('GET')),
			'a name the editor refused still reached the API'
		).toEqual([]);

		// the caps make the too-long sentences unreachable: 121 typed characters leave 120 in the field
		await nameField.fill('x'.repeat(121));
		expect(
			await nameField.evaluate((node) => (node as HTMLInputElement).value.length),
			'the name field kept more than 120'
		).toBe(120);
		await expect(
			sentence(editor, T.errors.NAME_TOO_LONG),
			'a capped field still complained about its length'
		).toHaveCount(0);
		// read the dialog before it is closed: `editor` is a live locator and a closed dialog is gone from the DOM
		const openAlerts = await editor.getByRole('alert').allInnerTexts();
		const openEditorText = flat(await editor.innerText());
		await editor.getByRole('button', { name: T.CANCEL, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		expect(served.countOf('POST', ROUTE), 'cancel came with a write').toBe(0);

		report('editor-form', {
			caps,
			alerts: openAlerts,
			editor: openEditorText.slice(0, 420),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 8. what a created rule sends

	test('8 · a created rule: the exact body, the list read that follows it, and the row that appears', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const served = await serveAutomations(page, { templates: [], rules: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });

		const editor = await openBlankEditor(page);
		await editor.getByRole('textbox').first().fill('Move tasks that reach done');
		await editor.getByRole('switch', { name: T.ENABLED_LABEL, exact: true }).click();
		await editor.getByRole('button', { name: T.CREATE, exact: true }).click();

		await expect.poll(() => served.countOf('POST', ROUTE), { timeout: 15_000 }).toBe(1);
		const post = served.calls.find((call) => call.method === 'POST');
		expect(post?.path, 'the create went somewhere else').toBe(ROUTE);
		expect(new URL(String(post?.url)).origin, 'the create went somewhere else than the mock').toBe(MOCK_API_ORIGIN);
		const body = JSON.parse(String(post?.body)) as Record<string, unknown>;
		// ruleInputFromForm:282-294 (no templateKey on a blank form) + the service's organizationId (:43); no tenantId here
		expect(body, 'the create body is not what ruleInputFromForm builds').toEqual({
			name: 'Move tasks that reach done',
			description: null,
			projectId: null,
			organizationTeamId: null,
			isEnabled: true,
			trigger: { type: 'STATUS_CHANGED', toStatuses: [], fromStatuses: [] },
			conditions: [],
			actions: [{ type: 'SET_STATUS', category: 'done' }],
			organizationId: organizationIdOf(fixture)
		});

		// CREATED toast (:147), and only the editor that saved closes (:150)
		await expect(sentence(page, T.CREATED)).toBeVisible();
		await expect(dialogOf(page), 'the editor stayed open after the rule was created').toHaveCount(0);
		// the write settled → tracked() invalidated the list (:164) → the re-read now holds the rule
		await expect.poll(() => served.countOf('GET', ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
		await expect.poll(() => ruleNames(page), { timeout: 15_000 }).toEqual(['Move tasks that reach done']);
		expect((await rowTexts(page))[0], 'the new row does not describe the saved rule').toContain(
			`Move tasks that reach done ${T.triggers.STATUS_CHANGED} → ${T.actions.SET_STATUS}`
		);
		expect(await switchStates(page), 'the new row does not show the switch the form said').toEqual([
			{ checked: 'true', label: filled('SWITCH_ARIA', { name: 'Move tasks that reach done' }) }
		]);
		await expect.poll(() => toastTexts(page), { timeout: 10_000 }).toEqual([T.CREATED]);
		expect((await mock.calls(ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('create', {
			postPath: post?.path ?? null,
			postBody: body,
			postBodyKeys: Object.keys(body).sort(),
			calls: served.shapes(),
			rows: await rowTexts(page),
			toasts: await toastTexts(page),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------------------------------------- 9. editing a rule, and an edit the editor refuses

	test('9 · editing a rule: the form opened with the rule, the full body it puts, and an incomplete edit it refuses', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const editable = ruleOf('bbbb0000-0000-4000-8000-000000000041', 'Edited rule', {
			position: 0,
			trigger: { type: 'STATUS_CHANGED', toStatuses: ['in-progress'], fromStatuses: ['open'] },
			conditions: [{ type: 'TITLE_CONTAINS', text: 'deploy' }]
		});
		const served = await serveAutomations(page, { templates: [], rules: [editable] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });

		await rowButton(page, T.EDIT, 'Edited rule').click();
		const editor = dialogOf(page);
		await expect(editor.getByRole('heading', { name: T.EDITOR_EDIT_TITLE, exact: true })).toBeVisible();
		await expect(editor.getByRole('button', { name: T.SAVE, exact: true })).toHaveCount(1);
		// formFromRule:220-228 read the rule back into the form, chip pickers included
		expect(
			await editor.getByRole('textbox').first().inputValue(),
			'the editor did not open with the rule name'
		).toBe('Edited rule');
		expect(
			await editor.getByRole('switch', { name: T.ENABLED_LABEL, exact: true }).getAttribute('aria-checked'),
			'the editor did not open with the rule switch'
		).toBe('true');
		// ChipPicker:131-171 shows each status twice (the two groups), so the chips are read group by group
		const pressedOf = (group: string) =>
			editor
				.getByRole('group', { name: group, exact: true })
				.getByRole('button')
				.evaluateAll((nodes) =>
					nodes.map((node) => ({
						label: node.textContent?.trim() ?? '',
						pressed: node.getAttribute('aria-pressed')
					}))
				);
		expect(await pressedOf(T.TO_STATUSES), 'the editor did not press the status the rule sends to').toEqual([
			{ label: 'open', pressed: 'false' },
			{ label: 'in-progress', pressed: 'true' }
		]);
		expect(await pressedOf(T.FROM_STATUSES), 'the editor did not press the status the rule comes from').toEqual([
			{ label: 'open', pressed: 'true' },
			{ label: 'in-progress', pressed: 'false' }
		]);

		await editor.getByRole('textbox').first().fill('Edited rule renamed');
		await editor.getByRole('button', { name: T.SAVE, exact: true }).click();
		await expect.poll(() => served.countOf('PUT', served.pathOf(editable.id)), { timeout: 15_000 }).toBe(1);
		const put = served.calls.find((call) => call.method === 'PUT');
		// the whole form is sent; the update is not shown before the answer here because the body is more than { isEnabled }
		expect(
			JSON.parse(String(put?.body)) as Record<string, unknown>,
			'the edit body is not what the update sends'
		).toEqual({
			name: 'Edited rule renamed',
			description: null,
			projectId: null,
			organizationTeamId: null,
			isEnabled: true,
			trigger: { type: 'STATUS_CHANGED', toStatuses: ['in-progress'], fromStatuses: ['open'] },
			conditions: [{ type: 'TITLE_CONTAINS', text: 'deploy' }],
			actions: [{ type: 'SET_STATUS', category: 'done' }],
			organizationId: organizationIdOf(fixture),
			tenantId: tenantIdOf(fixture)
		});
		await expect(sentence(page, T.SAVED)).toBeVisible();
		await expect(dialogOf(page), 'the editor stayed open after the rule was saved').toHaveCount(0);
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([
				`Edited rule renamed ${T.triggers.STATUS_CHANGED} → ${T.actions.SET_STATUS} ${T.SCOPE_ORGANIZATION} · ${T.NEVER_RAN}`
			]);
		await expect.poll(() => served.countOf('GET', ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);

		// an incomplete rule: each half-filled item gets its own sentence, in the editor's own order, and nothing is sent
		const incomplete = ruleOf('bbbb0000-0000-4000-8000-000000000042', 'Incomplete edit', {
			position: 0,
			conditions: [{ type: 'STATUS_IS' }, { type: 'TITLE_CONTAINS', text: '' }],
			actions: [{ type: 'SET_PRIORITY' }, { type: 'ADD_LABELS' }]
		});
		const refused = await serveAutomations(page, { templates: [], rules: [incomplete] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible();
		await rowButton(page, T.EDIT, 'Incomplete edit').click();
		const second = dialogOf(page);
		await second.getByRole('button', { name: T.SAVE, exact: true }).click();
		await expect
			.poll(() => second.getByRole('alert').allInnerTexts(), { timeout: 15_000 })
			.toEqual([
				T.errors.CONDITION_VALUE_REQUIRED,
				T.errors.CONDITION_TEXT_REQUIRED,
				T.errors.ACTION_PRIORITY_REQUIRED,
				T.errors.ACTION_LABELS_REQUIRED
			]);
		// the mock answers the labels as pagination([]), so that picker says it has nothing to pick from (ChipPicker:169)
		await expect(sentence(second, T.NOTHING_TO_PICK)).toHaveCount(1);
		// read the alerts while the editor is still open; `second` is a live locator and a closed dialog is gone
		const incompleteAlerts = (await second.getByRole('alert').allInnerTexts()).map(flat);
		await second.getByRole('button', { name: T.CANCEL, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		expect(
			refused.calls.filter((call) => call.method !== 'GET'),
			'an edit the editor refused, or a cancel, still wrote'
		).toEqual([]);
		await expect.poll(() => ruleNames(page), { timeout: 10_000 }).toEqual(['Incomplete edit']);

		report('edit', {
			putBody: JSON.parse(String(put?.body)) as Record<string, unknown>,
			incompleteAlerts,
			calls: served.shapes(),
			refusedCalls: refused.shapes(),
			toasts: await toastTexts(page),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 10. the row's switch

	test('10 · switching a rule off: the switch-only body, the flip shown at once, and a refused switch putting it back', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const kept = ruleOf('bbbb0000-0000-4000-8000-000000000051', 'Switch refused', { position: 0 });
		const served = await serveAutomations(page, {
			templates: [],
			rules: [kept],
			updateRefusal: { status: 500, message: 'this file refused the switch', delayMs: 1_500 }
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });

		const rowSwitch = page.getByRole('switch', {
			name: filled('SWITCH_ARIA', { name: 'Switch refused' }),
			exact: true
		});
		await expect(rowSwitch).toBeChecked();
		await rowSwitch.click();
		// updateMutation.onMutate shows the switch before the answer (use-task-automations.ts:187-194). This file answers
		// the refused switch 1.5 s later (Refusal.delayMs below) so that shown state can be seen at all; a polling
		// matcher on an instantly refused write only ever sees the rollback.
		await expect(rowSwitch).not.toBeChecked();

		await expect.poll(() => served.countOf('PUT', served.pathOf(kept.id)), { timeout: 15_000 }).toBe(1);
		const put = served.calls.find((call) => call.method === 'PUT');
		expect(
			JSON.parse(String(put?.body)) as Record<string, unknown>,
			'a switch write sent more than the switch'
		).toEqual({
			isEnabled: false,
			organizationId: organizationIdOf(fixture),
			tenantId: tenantIdOf(fixture)
		});

		// onError puts back that rule's switch only (:195-203); the page says it in its own sentence, no fallback joins it
		await expect
			.poll(() => switchStates(page), { timeout: 15_000 })
			.toEqual([{ checked: 'true', label: filled('SWITCH_ARIA', { name: 'Switch refused' }) }]);
		await expect(sentence(page, T.TOGGLE_FAILED)).toBeVisible();
		await expect(sentence(page, R.SERVER)).toBeVisible();
		await expect.poll(() => toastTexts(page), { timeout: 10_000 }).toEqual([`${T.TOGGLE_FAILED} ${R.SERVER}`]);
		await expect.poll(() => served.countOf('GET', ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);

		report('switch-refused', {
			putBody: JSON.parse(String(put?.body)) as Record<string, unknown>,
			switches: await switchStates(page),
			toasts: await toastTexts(page),
			devToastCount: await devToasts(page).count(),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 130))
		});
		expect(
			consoleFindings(shield, [armedHttpError('PUT', `${LOGGED_ROUTE}/${kept.id}`, 500)]),
			'besides its own HTTP error line the page logged a console error'
		).toEqual([]);
	});

	test('11 · a switch the platform accepts: the flip stays, the list is read again, and nothing is said', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const rule = ruleOf('bbbb0000-0000-4000-8000-000000000052', 'Switch accepted', { position: 0 });
		const served = await serveAutomations(page, { templates: [], rules: [rule] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });

		const rowSwitch = page.getByRole('switch', {
			name: filled('SWITCH_ARIA', { name: 'Switch accepted' }),
			exact: true
		});
		await rowSwitch.click();
		await expect(rowSwitch).not.toBeChecked();
		await expect.poll(() => served.countOf('PUT', served.pathOf(rule.id)), { timeout: 15_000 }).toBe(1);
		await expect
			.poll(() => switchStates(page), { timeout: 15_000 })
			.toEqual([{ checked: 'false', label: filled('SWITCH_ARIA', { name: 'Switch accepted' }) }]);
		expect(
			served.items.find((item) => item.id === rule.id)?.isEnabled,
			'the fake platform did not store the switch'
		).toBe(false);
		await expect.poll(() => served.countOf('GET', ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
		await expect.poll(() => toastTexts(page), { timeout: 5_000 }).toEqual([]);
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);

		report('switch-accepted', { calls: served.shapes(), switches: await switchStates(page) });
	});

	// ---------------------------------------------------------------- 11. reorder

	test('12 · reordering: the ids it puts, the optimistic swap, and a refused reorder putting the order back', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const first = ruleOf('bbbb0000-0000-4000-8000-000000000061', 'Order first', { position: 0 });
		const second = ruleOf('bbbb0000-0000-4000-8000-000000000062', 'Order second', { position: 1 });
		const served = await serveAutomations(page, { templates: [], rules: [first, second] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });
		await expect.poll(() => ruleNames(page), { timeout: 15_000 }).toEqual(['Order first', 'Order second']);

		await rowButton(page, T.MOVE_DOWN, 'Order first').click();
		await expect.poll(() => served.countOf('PUT', ORDER_ROUTE), { timeout: 15_000 }).toBe(1);
		const put = served.calls.find((call) => call.method === 'PUT');
		// moveRuleId over the ids (:153-160) → the reorder body (task-automations.service.ts:52-55)
		expect(JSON.parse(String(put?.body)) as Record<string, unknown>, 'the reorder body is not { ids, … }').toEqual({
			ids: [second.id, first.id],
			organizationId: organizationIdOf(fixture),
			tenantId: tenantIdOf(fixture)
		});
		// the swap is shown before the answer (use-task-automations.ts:215-221), and a reorder that worked says nothing
		await expect.poll(() => ruleNames(page), { timeout: 15_000 }).toEqual(['Order second', 'Order first']);
		await expect.poll(() => toastTexts(page), { timeout: 5_000 }).toEqual([]);
		await expect.poll(() => served.countOf('GET', ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);

		// refused: the order goes back (:222-226) and the page says it in its own sentence
		const refused = await serveAutomations(page, {
			templates: [],
			rules: [first, second],
			orderRefusal: { status: 500, message: 'this file refused the order' }
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible();
		await rowButton(page, T.MOVE_DOWN, 'Order first').click();
		await expect.poll(() => refused.countOf('PUT', ORDER_ROUTE), { timeout: 15_000 }).toBe(1);
		await expect.poll(() => ruleNames(page), { timeout: 15_000 }).toEqual(['Order first', 'Order second']);
		await expect(sentence(page, T.REORDER_FAILED)).toBeVisible();
		await expect(sentence(page, R.SERVER)).toBeVisible();
		await expect.poll(() => toastTexts(page), { timeout: 10_000 }).toEqual([`${T.REORDER_FAILED} ${R.SERVER}`]);

		report('reorder', {
			putBody: JSON.parse(String(put?.body)) as Record<string, unknown>,
			calls: served.shapes(),
			refusedCalls: refused.shapes(),
			toasts: await toastTexts(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 130))
		});
		expect(
			consoleFindings(shield, [armedHttpError('PUT', LOGGED_ORDER_ROUTE, 500)]),
			'besides its own HTTP error line the page logged a console error'
		).toEqual([]);
	});

	// ---------------------------------------------------------------- 12. delete

	test('13 · delete: the question it asks, a cancel that sends nothing, a confirm that deletes at the measured path', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const dropped = ruleOf('bbbb0000-0000-4000-8000-000000000071', 'Delete me', { position: 0 });
		const kept = ruleOf('bbbb0000-0000-4000-8000-000000000072', 'Keep me', { position: 1 });
		const served = await serveAutomations(page, { templates: [], rules: [dropped, kept] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });

		await rowButton(page, T.DELETE, 'Delete me').click();
		const question = dialogOf(page);
		await expect(question.getByRole('heading', { name: T.DELETE_TITLE, exact: true })).toBeVisible();
		await expect(sentence(question, T.DELETE_DESCRIPTION)).toBeVisible();
		// subject={deleting?.name} (automations-settings-page.tsx:244)
		await expect(sentence(question, 'Delete me')).toBeVisible();
		await expect(question.getByRole('button', { name: T.DELETE_CONFIRM, exact: true })).toHaveCount(1);
		await expect(question.getByRole('button', { name: EN.common.CANCEL, exact: true })).toHaveCount(1);
		const questionText = flat(await question.innerText());

		await question.getByRole('button', { name: EN.common.CANCEL, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		await expect.poll(() => ruleNames(page), { timeout: 10_000 }).toEqual(['Delete me', 'Keep me']);
		expect(served.countOf('DELETE', served.pathOf(dropped.id)), 'a cancelled delete still sent a DELETE').toBe(0);

		await rowButton(page, T.DELETE, 'Delete me').click();
		await dialogOf(page).getByRole('button', { name: T.DELETE_CONFIRM, exact: true }).click();
		await expect.poll(() => served.countOf('DELETE', served.pathOf(dropped.id)), { timeout: 15_000 }).toBe(1);
		const del = served.calls.find((call) => call.method === 'DELETE');
		// task-automations.service.ts:57-59: DELETE <route>/<id>?organizationId=… with no body
		expect(del?.url, 'the DELETE went somewhere else than the mock').toBe(
			`${MOCK_API_ORIGIN}${ROUTE}/${dropped.id}?organizationId=${organizationIdOf(fixture)}`
		);
		expect(del?.body ?? null, 'the DELETE carried a body').toBeNull();
		await expect.poll(() => ruleNames(page), { timeout: 15_000 }).toEqual(['Keep me']);
		await expect(dialogOf(page), 'the question stayed open after the rule was deleted').toHaveCount(0);
		await expect(sentence(page, T.DELETED)).toBeVisible();
		await expect.poll(() => served.countOf('GET', ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
		expect((await mock.calls(ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('delete', {
			question: questionText,
			deleteUrl: del?.url ?? null,
			calls: served.shapes(),
			rowsAfter: await ruleNames(page),
			toasts: await toastTexts(page),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 13. refused writes

	test('14 · a create and a delete the platform refuses: the sentences, the fallback toast, the form and the row that stay', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);

		// refused create: the editor keeps the form open and two user-facing sentences appear (see the findings)
		const servedCreate = await serveAutomations(page, {
			templates: [],
			rules: [],
			createRefusal: { status: 500, message: 'this file refused the create' }
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });
		const editor = await openBlankEditor(page);
		await editor.getByRole('textbox').first().fill('Refused create');
		await editor.getByRole('button', { name: T.CREATE, exact: true }).click();
		await expect(sentence(page, T.SAVE_FAILED)).toBeVisible({ timeout: 25_000 });
		await expect(sentence(page, R.SERVER).first()).toBeVisible();
		await expect(
			editor.getByRole('heading', { name: T.EDITOR_CREATE_TITLE, exact: true }),
			'the editor closed although the save failed'
		).toBeVisible();
		await expect(editor.getByRole('textbox').first()).toHaveValue('Refused create');
		expect(servedCreate.countOf('POST', ROUTE), 'the create was sent more than once').toBe(1);
		// while a dialog is open the page behind it is hidden from role locators, so the store is read here
		expect(servedCreate.items, 'a refused create still stored a rule').toEqual([]);
		const createToasts = await toastTexts(page);
		expect(createToasts, 'a refused create is not the pair of sentences this page raises').toEqual([
			`${T.SAVE_FAILED} ${R.SERVER}`,
			`${EN.toasts.MUTATION_FAILED} ${R.SERVER}`
		]);
		// the write settled (refused) and tracked() invalidated the list anyway (use-task-automations.ts:152-169)
		expect(
			servedCreate.countOf('GET', ROUTE),
			'a refused create was not followed by the list re-read'
		).toBeGreaterThanOrEqual(2);
		await editor.getByRole('button', { name: T.CANCEL, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		// with the editor closed the list is readable again, and it holds no new row
		await expect.poll(() => ruleNames(page), { timeout: 10_000 }).toEqual([]);

		// refused delete (404): the question stays open with the reason under it, and the row stays
		const stuck = ruleOf('bbbb0000-0000-4000-8000-000000000081', 'Refused delete', { position: 0 });
		const servedDelete = await serveAutomations(page, {
			templates: [],
			rules: [stuck],
			removeRefusal: { status: 404, message: 'Not Found' }
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible();
		await rowButton(page, T.DELETE, 'Refused delete').click();
		const question = dialogOf(page);
		await question.getByRole('button', { name: T.DELETE_CONFIRM, exact: true }).click();
		await expect(question, 'the question closed although the delete failed').toBeVisible();
		await expect(question.getByRole('alert')).toContainText(R.NOT_FOUND);
		await expect(question.getByRole('heading', { name: T.DELETE_TITLE, exact: true })).toBeVisible();
		// the fake platform changed nothing, and the rule is still there (measured: the row survives the refusal)
		expect(
			servedDelete.items.map((item) => item.name),
			'a refused delete still dropped the rule from the platform'
		).toEqual(['Refused delete']);
		// the open question still names the rule it was asked about. The row itself cannot be read here: while the
		// dialog is open its name matches twice (the row's span and the dialog's block) and the page behind the
		// dialog is hidden from role locators, so the row is read from the store now and from the list once closed.
		await expect(question.getByText('Refused delete', { exact: true })).toHaveCount(1);
		expect(servedDelete.countOf('DELETE', servedDelete.pathOf(stuck.id)), 'the delete was sent twice').toBe(1);
		await expect
			.poll(() => toastTexts(page), { timeout: 10_000 })
			.toEqual([`${EN.toasts.MUTATION_FAILED} ${R.NOT_FOUND}`]);

		report('writes-refused', {
			createToasts,
			deleteToasts: await toastTexts(page),
			deleteAlert: (await question.getByRole('alert').allInnerTexts()).map(flat),
			createCalls: servedCreate.shapes(),
			deleteCalls: servedDelete.shapes(),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 130))
		});

		// a modal dialog hides the page behind it from role locators, so the row itself is read once it is closed
		await question.getByRole('button', { name: EN.common.CANCEL, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		await expect.poll(() => ruleNames(page), { timeout: 10_000 }).toEqual(['Refused delete']);
		expect(
			consoleFindings(shield, [
				armedHttpError('POST', LOGGED_ROUTE, 500),
				armedHttpError('DELETE', `${LOGGED_ROUTE}/${stuck.id}?organizationId=${organizationIdOf(fixture)}`, 404)
			]),
			'besides its own HTTP error lines the page logged a console error'
		).toEqual([]);
	});

	// ---------------------------------------------------------------- 14. failed reads

	test('15 · a list read or an availability probe that fails: the notice, the retry button, the sidebar entry', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const organizationId = organizationIdOf(fixture);
		const cases = [
			{
				label: 'list 500',
				script: {
					templates: [],
					rules: [],
					listRefusal: { status: 500, message: 'this file refused the list' }
				},
				notice: [`${T.ERROR_TITLE} ${R.SERVER} ${T.RETRY}`],
				retry: 1,
				rulesSection: 1,
				navEntry: 1,
				armed: armedHttpError('GET', `${LOGGED_ROUTE}?organizationId=${organizationId}`, 500)
			},
			{
				label: 'list 404',
				script: { templates: [], rules: [], listRefusal: { status: 404, message: 'Not Found' } },
				notice: [`${T.ERROR_TITLE} ${R.NOT_FOUND} ${T.RETRY}`],
				retry: 1,
				rulesSection: 1,
				navEntry: 1,
				armed: armedHttpError('GET', `${LOGGED_ROUTE}?organizationId=${organizationId}`, 404)
			},
			{
				label: 'list 403',
				script: { templates: [], rules: [], listRefusal: { status: 403, message: 'no' } },
				notice: [`${T.ERROR_TITLE} ${R.PERMISSION} ${T.RETRY}`],
				retry: 1,
				rulesSection: 1,
				navEntry: 1,
				armed: armedHttpError('GET', `${LOGGED_ROUTE}?organizationId=${organizationId}`, 403)
			},
			{
				label: 'templates 403',
				script: { templates: [], templatesRefusal: { status: 403, message: 'no' } },
				notice: [`${T.FORBIDDEN_TITLE} ${T.FORBIDDEN_DESCRIPTION}`],
				retry: 0,
				rulesSection: 0,
				navEntry: 1,
				armed: armedHttpError('GET', `${LOGGED_TEMPLATES_ROUTE}?organizationId=${organizationId}`, 403)
			},
			{
				label: 'templates 404',
				script: { templates: [], templatesRefusal: { status: 404, message: 'Not Found' } },
				notice: [`${T.UNAVAILABLE_TITLE} ${T.UNAVAILABLE_DESCRIPTION}`],
				retry: 0,
				rulesSection: 0,
				navEntry: 0,
				armed: armedHttpError('GET', `${LOGGED_TEMPLATES_ROUTE}?organizationId=${organizationId}`, 404)
			},
			{
				label: 'templates 500',
				// AutomationsSettingsContent:266-274 gives this notice a retry button and no reason sentence
				script: { templates: [], templatesRefusal: { status: 500, message: 'no' } },
				notice: [`${T.ERROR_TITLE} ${T.RETRY}`],
				retry: 1,
				rulesSection: 0,
				navEntry: 1,
				armed: armedHttpError('GET', `${LOGGED_TEMPLATES_ROUTE}?organizationId=${organizationId}`, 500)
			}
		];
		const armed: string[] = [];
		const measured: Array<Record<string, unknown>> = [];
		for (const item of cases) {
			const served = await serveAutomations(page, item.script);
			await signInAndVisit(page, fixture, PAGE_PATH);
			armed.push(item.armed);

			await expect(settingsArea(page)).toBeVisible({ timeout: 25_000 });
			await expect.poll(() => noticeTexts(settingsArea(page)), { timeout: 20_000 }).toEqual(item.notice);
			await expect(
				page.getByRole('button', { name: T.RETRY, exact: true }),
				`${item.label}: the retry button is not the one the page builds`
			).toHaveCount(item.retry);
			await expect(
				rulesHeading(page),
				`${item.label}: the Rules section was drawn against ${item.label}`
			).toHaveCount(item.rulesSection);
			await expect(
				settingsNavEntry(page),
				`${item.label}: the sidebar entry does not follow showsAutomationsEntry`
			).toHaveCount(item.navEntry);
			expect(
				served.calls.some((call) => call.method !== 'GET'),
				`${item.label}: a failed read wrote something`
			).toBe(false);
			// read counts are not pinned beyond "more than one": a failed read is retried (see the findings)
			measured.push({
				label: item.label,
				reads: served.countOf('GET', served.calls[0]?.path === TEMPLATES_ROUTE ? TEMPLATES_ROUTE : ROUTE),
				area: flat(await settingsArea(page).innerText()),
				armedLines: shield.consoleErrors().filter((line) => line.includes(item.armed)).length
			});
			expect(
				consoleFindings(shield, armed),
				`${item.label}: besides its own HTTP error lines the page logged a console error`
			).toEqual([]);
		}
		report('read-refused', measured);
	});

	// ---------------------------------------------------------------- 15. the gate and the platform's limit

	test('16 · not a manager of this team: the gate answers with its own sentence and nothing of the platform is asked', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const served = await serveAutomations(page, {
			templates: [],
			rules: [ruleOf('bbbb0000-0000-4000-8000-000000000091', 'Gate rule', { position: 0 })]
		});
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE_PATH, { scenario: { manager: false } });

		// TeamSettingsGate:39-56 requiresManager → ManagersOnly :19-37: a card in the settings column, no SettingsPage header
		await expect(sentence(page, EN.settings.common.MANAGERS_ONLY_TITLE)).toBeVisible({ timeout: 25_000 });
		await expect(sentence(page, EN.settings.common.MANAGERS_ONLY_DESCRIPTION)).toBeVisible();
		await expect(
			page.getByRole('heading', { level: 1 }),
			'the gate rendered a page title the components do not build'
		).toHaveCount(0);
		await expect(rulesHeading(page), 'the Rules section was drawn for a person the gate refused').toHaveCount(0);
		await expect(newRuleButton(page), 'New rule was offered to a person the gate refused').toHaveCount(0);
		await expect(ruleRows(page), 'a refused person was shown the rules').toHaveCount(0);
		// the gate offers a way back to Settings › Team
		await expect(
			page.getByRole('link', { name: EN.settings.entries.teamGeneral.TITLE, exact: true }).first()
		).toBeVisible();
		expect(served.calls.length, 'the platform was asked something for a person the gate refused').toBe(0);
		expect(calls.mockCalls.length, 'the browser asked the platform something for a person the gate refused').toBe(
			0
		);
		await expect(settingsNavEntry(page), 'the sidebar lists Automations for a person the gate refuses').toHaveCount(
			0
		);
		expect((await mock.calls(ROUTE)).length, 'the mock heard a task-automations call').toBe(0);

		report('gate', {
			card: flat(await sentence(page, EN.settings.common.MANAGERS_ONLY_TITLE).locator('xpath=../..').innerText()),
			generalLinks: await page
				.getByRole('link', { name: EN.settings.entries.teamGeneral.TITLE, exact: true })
				.count(),
			navEntry: await settingsNavEntry(page).count(),
			calls: calls.mockCalls,
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('17 · a hundred rules: New rule is disabled, the list still shows all of them, and the ends cannot move', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const many = Array.from({ length: 100 }, (_unused, index) =>
			ruleOf(`bbbb0000-0000-4000-8000-0000000001${String(index).padStart(2, '0')}`, `Limit rule ${index + 1}`, {
				position: index,
				createdAt: dayIso(-index - 1)
			})
		);
		const served = await serveAutomations(page, { templates: [], rules: many });
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });
		// TASK_AUTOMATION_LIMITS.rulesPerOrganization = 100 (task-automation.ts:202)
		await expect.poll(() => ruleNames(page).then((names) => names.length), { timeout: 20_000 }).toBe(100);
		await expect(newRuleButton(page)).toHaveCount(1);
		await expect(newRuleButton(page)).toBeDisabled();
		expect(served.countOf('POST', ROUTE), 'a disabled button still wrote').toBe(0);
		const moves = await moveButtonStates(page);
		expect(moves[0], 'the first of a hundred rows may move up').toEqual({
			label: `${T.MOVE_UP}: Limit rule 1`,
			disabled: true
		});
		expect(moves[1], 'the first of a hundred rows cannot move down').toEqual({
			label: `${T.MOVE_DOWN}: Limit rule 1`,
			disabled: false
		});
		expect(moves[moves.length - 2], 'the last of a hundred rows cannot move up').toEqual({
			label: `${T.MOVE_UP}: Limit rule 100`,
			disabled: false
		});
		expect(moves[moves.length - 1], 'the last of a hundred rows may move down').toEqual({
			label: `${T.MOVE_DOWN}: Limit rule 100`,
			disabled: true
		});

		report('limit', {
			rows: (await ruleNames(page)).length,
			newRuleDisabled: await newRuleButton(page).isDisabled(),
			calls: served.shapes().map((shape) => shape.split(' ').slice(0, 2).join(' ')),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 16. the two dialogs of a row

	test('18 · the two dialogs of a row: the run history (read only while open) and the dry run (which writes only on request)', async ({
		page,
		fixture,
		shield
	}) => {
		await turnAutomationsOnHere(page);
		const rule = ruleOf('bbbb0000-0000-4000-8000-000000000101', 'Dialog probe', { position: 0 });
		const runsPath = `${ROUTE}/${rule.id}/runs`;
		const testPath = `${ROUTE}/${rule.id}/test`;
		const served = await serveAutomations(page, {
			templates: [],
			rules: [rule],
			runs: [
				{
					id: 'bbbb0000-0000-4000-8000-000000000102',
					ruleId: rule.id,
					taskId: null,
					eventKey: 'probe-event',
					triggerType: 'STATUS_CHANGED',
					outcome: 'APPLIED',
					depth: 0,
					createdAt: dayIso(-2),
					details: { changes: [{ action: 'SET_STATUS', from: 'open', to: 'in-progress' }] }
				},
				{
					id: 'bbbb0000-0000-4000-8000-000000000103',
					ruleId: rule.id,
					taskId: null,
					eventKey: 'probe-event',
					triggerType: 'STATUS_CHANGED',
					outcome: 'FAILED',
					depth: 1,
					error: 'upstream said no',
					createdAt: dayIso(-3)
				}
			]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible({ timeout: 25_000 });
		// useTaskAutomationRuns:105-113 asks only while a rule id is set
		expect(served.countOf('GET', runsPath), 'the history was read before it was opened').toBe(0);

		await rowButton(page, T.HISTORY, 'Dialog probe').click();
		const history = dialogOf(page);
		await expect(
			history.getByRole('heading', { name: filled('HISTORY_TITLE', { name: 'Dialog probe' }), exact: true })
		).toBeVisible();
		await expect.poll(() => served.countOf('GET', runsPath), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
		const runsCall = served.calls.find((call) => call.path === runsPath);
		expect(runsCall?.search, 'the runs read does not carry the organization and the limit').toBe(
			`?organizationId=${organizationIdOf(fixture)}&limit=50`
		);
		const historyText = flat(await history.innerText());
		expect(historyText, 'the served runs are not on the screen').toContain(`${T.outcomes.APPLIED} 2 days ago`);
		expect(historyText).toContain(`${T.actions.SET_STATUS} · open → in-progress`);
		expect(historyText).toContain(`${T.outcomes.FAILED} 3 days ago`);
		expect(historyText).toContain('upstream said no');
		await expect(history.getByRole('button', { name: T.REFRESH, exact: true })).toHaveCount(1);
		// the footer Close and the header's icon Close (measured: 2 of them)
		await expect(history.getByRole('button', { name: EN.common.CLOSE, exact: true })).toHaveCount(2);
		await history.getByRole('button', { name: EN.common.CLOSE, exact: true }).last().click();
		await expect(dialogOf(page), 'the history stayed open after Close').toHaveCount(0);

		await rowButton(page, T.TEST, 'Dialog probe').click();
		const testDialog = dialogOf(page);
		await expect(
			testDialog.getByRole('heading', { name: filled('TEST_TITLE', { name: 'Dialog probe' }), exact: true })
		).toBeVisible();
		await expect(sentence(testDialog, T.TEST_DESCRIPTION)).toBeVisible();
		await expect(testDialog.getByRole('button', { name: T.TEST_RUN, exact: true })).toBeDisabled();
		expect(served.countOf('POST', testPath), 'opening the dry run tested something').toBe(0);
		await testDialog.getByRole('button', { name: T.CANCEL, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);

		// a dry run the platform refuses: the dialog's own sentence with the reason, the dialog stays open, exactly one POST
		const refusedTest = await serveAutomations(page, {
			templates: [],
			rules: [rule],
			testRefusal: { status: 500, message: 'this file refused the test' }
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rulesHeading(page)).toBeVisible();
		await rowButton(page, T.TEST, 'Dialog probe').click();
		const second = dialogOf(page);
		// the lane's own task list fills the picker (taskOptionsOf, automation-pickers.tsx:71-80)
		await second.getByRole('combobox').first().click();
		const taskOptions = await page.getByRole('option').allInnerTexts();
		expect(taskOptions, 'the dry run offers no task of this team').toContain('#1 Fixture active task');
		await page.getByRole('option').first().click();
		await expect(second.getByRole('button', { name: T.TEST_RUN, exact: true })).toBeEnabled();
		await second.getByRole('button', { name: T.TEST_RUN, exact: true }).click();
		await expect(second.getByRole('alert')).toContainText(`${T.TEST_FAILED} · ${R.SERVER}`, { timeout: 25_000 });
		await expect(second, 'the dry run closed after a refusal').toBeVisible();
		expect(refusedTest.countOf('POST', testPath), 'the dry run was sent more than once').toBe(1);
		const testPost = refusedTest.calls.find((call) => call.method === 'POST');
		expect(
			JSON.parse(String(testPost?.body)) as Record<string, unknown>,
			'the dry run body is not { taskId, organizationId }'
		).toEqual({
			taskId: fixture.ids.task,
			organizationId: organizationIdOf(fixture)
		});
		// read the alert while the test dialog is still open; `second` is a live locator and a closed dialog is gone
		const testAlert = (await second.getByRole('alert').allInnerTexts()).map(flat);
		await second.getByRole('button', { name: T.CANCEL, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);

		report('dialogs', {
			historyText,
			runsSearch: runsCall?.search ?? null,
			testTaskOptions: taskOptions,
			testAlert,
			testBody: JSON.parse(String(testPost?.body)) as Record<string, unknown>,
			calls: served.shapes().map((shape) => shape.split(' ').slice(0, 2).join(' ')),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 110))
		});
		expect(
			consoleFindings(shield, [armedHttpError('POST', `${LOGGED_ROUTE}/${rule.id}/test`, 500)]),
			'besides its own HTTP error line the page logged a console error'
		).toEqual([]);
	});
});

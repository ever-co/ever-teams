import { expect, test, type Page } from '../../fixtures';
import type { Locator } from '@playwright/test';

import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person sees on a task's own page and on the Kanban board when their address is not verified: four create
 * actions `develop` put behind `useIsEmailVerificationSatisfied`, pinned on lane-c (app 3033, mock 4002) on
 * 2026-11-23 in the runs `E:\Coding\.tmp\s2-lane-c-tdgates-<n>.log`. Each `MEASURE` line prints what the page and the
 * network really did, so every assertion below can be re-checked against the log.
 *
 * `suites/lane-b/verification-gated-actions.spec.ts` pinned the four gates that were already covered — the header's
 * team menu, Settings › Members invite, the timer's task picker and the Kanban invite — and this file repeats none of
 * them. It copies that file's technique exactly: the user read and the status read are stubbed with `page.route`
 * **before** the first navigation (`signInAndVisit`, `playwright/helpers.ts:432-444`: routes first, cookies second,
 * navigation last), the mock's own CORS headers are restated on every answer this spec writes, and the same five
 * states A–E are walked per gate.
 *
 * ## The gate these tests measure
 *
 * - `core/lib/auth/email-verification.ts` (46 lines, read whole): `isEmailVerificationSatisfied(user, state)` is
 *   `false` with no user (`:19-21`), `true` when the user's own flag says verified (`:22-24`), `true` when
 *   `state === null`, i.e. a deployment that verifies no address (`:25-27`), and otherwise
 *   `state?.isEmailVerified === true` (`:29`).
 * - `core/hooks/auth/use-email-verification-status.ts`: the status is asked only while the user is unverified (`:31`
 *   `isUnverified`, `:35` `enabled`), so a verified person never causes the call; `UNREADABLE_STATUS`
 *   `{ isEmailVerified: false }` (`:23`) is what the hook returns when the query errored and has no data yet
 *   (`:38-41`) — an outage reads as unverified.
 * - `core/services/client/api/users/emails/email-verification.service.ts`: the ask is
 *   `GET '/auth/email/verify/status'` while `GAUZY_API_BASE_SERVER_URL.value` is set (`:29-30`), and a 404 is answered
 *   `null` (`:40-42`).
 * - The lane mock cannot supply either answer on its own: its users are always verified (`mock-gauzy-server.mjs:98`,
 *   `:115`, `:126`; `/api/user/me` is answered at `:422` and `:551`) and `grep -n "verify" mock-gauzy-server.mjs`
 *   answers **nothing**, so the status path falls through to `pagination([])` (`:813`), which
 *   `emailVerificationStatusSchema` (`core/types/schemas/auth/email-verification.schema.ts:24-27`, `isEmailVerified`
 *   required) rejects. So the user is stubbed as the mock's real answer with only `isEmailVerified` changed, and the
 *   status is answered by this spec. Both calls are cross-origin (page on `http://localhost:3033`, API on
 *   `http://127.0.0.1:4002`, the pair `playwright/test-servers.ts:40` and `:105-111` set up), so every answer this
 *   spec writes restates the mock's own CORS set (`mock-gauzy-server.mjs:1004-1013`); without it the browser discards
 *   the answer and the read becomes an error, which would silently turn B, C and D into the outage case.
 *
 * ## The four gates, and the element each one decides
 *
 * - `core/components/tasks/detail/task-detail-subtasks.tsx`: `canCreate = useIsEmailVerificationSatisfied(user)`
 *   (`:60`) hands `onCreate` only when it holds (`:62-65`) and passes it to the picker (`:74`).
 * - `core/components/tasks/detail/task-detail-relations.tsx`: the same, at `:155`, `:156-159`, `:168`.
 * - `core/components/tasks/detail/task-parent-field.tsx`: the same, at `:52`, `:53-56`, `:74`. The row it sits in is
 *   rendered because `showsParent = canHaveParent(task)`
 *   (`core/components/tasks/detail/task-detail-properties.tsx:81`, `:158-165`) and `canHaveParent` is true for this
 *   fixture task, which carries no `issueType` (`core/lib/utils/task-detail.ts:210-212`).
 * - All three land in `core/components/tasks/detail/task-picker-menu.tsx`: `canCreate = Boolean(onCreate)` (`:78`)
 *   and `showsCreate = canCreate && isCreatableTitle(query)` (`:82`, `:41-43`), and `showsCreate` alone decides
 *   whether the footer's `TaskPropertyMenuAction` row (`:94-98`) is rendered. With `onCreate` undefined the row is
 *   simply never there; nothing else in the popup changes, and none of the three components renders a tooltip or a
 *   notice instead (`grep -n Verification core/components/tasks/detail` answers only those three hook calls), which is
 *   what cases C and E pin: the action is missing and the page says nothing about why.
 * - `core/components/tasks/task-input-kanban.tsx`: the Kanban column's create form wraps its `Create task` button in
 *   `Tooltip enabled={!datas.meetsEmailVerification}` with `label = t('common.VERIFY_ACCOUNT_MSG')` (`:645-650`, the
 *   button `:651-666`), and `isTaskCreationBlocked` (`:672-677`) counts `isUnverified = !datas.meetsEmailVerification`
 *   (`:675`) among the four reasons that button is `disabled`. `meetsEmailVerification` comes from `useTaskInput`
 *   (`core/hooks/tasks/use-task-input.ts:61`), whose `handleTaskCreation` refuses for the same reason (`:161`).
 *   `Tooltip` with `enabled={false}` renders its children alone and no label element at all
 *   (`core/components/duplicated-components/tooltip.tsx:46-79`), so a satisfied person has no such bubble to find.
 *
 * ## Where these are reached on this lane
 *
 * - The task page: `app/[locale]/(main)/task/[id]/page.tsx` → `http://localhost:3033/task/<fixture.ids.task>`, which
 *   renders `TaskDetailPageBody` (`:132`). The body renders `TaskDetailSubtasks` and `TaskDetailRelations` in the
 *   scrolling column (`core/components/pages/task/task-detail-page-body.tsx:75`, `:76`) and `TaskDetailProperties`,
 *   which holds the parent field (`:46-48`). The page loads the task through `getTaskById` (`:59-65`), asking
 *   `GET /api/tasks/<id>` (`core/services/client/api/tasks/task.service.ts:85-93`); the mock answers that with its
 *   fixture task (`mock-gauzy-server.mjs:623`). The subtask and relation sections are `section aria-labelledby`
 *   elements named by their `h2` (`core/components/tasks/detail/task-detail-section.tsx:21-25`), which is why they are
 *   read as regions here.
 * - The Kanban board: `/kanban` → `KanbanPage` (`core/components/pages/kanban/board/kanban-page.tsx:159`). Its column
 *   offers the task input twice — the header's `+` button with `aria-label = t('common.CREATE_TASK')`
 *   (`kanban-lane.tsx:140-148`) and the column's own `Create task` row (`:154-167`) — both calling
 *   `createTaskIn(status)` (`kanban-page.tsx:178`), which renders `LazyCreateTaskModal` inside a `Modal`
 *   (`kanban-page.tsx:293-305`; `core/components/features/tasks/create-task-modal.tsx:25`, `:27-39`). The column is
 *   the `section aria-label` `kanban-lane.tsx:249-251` names with `statusLabelOf` (`:53-56`), which for the lane's
 *   first status (`mock-gauzy-server.mjs:145-156`, `name: 'open'`) is the word `open`.
 * - The three pickers hold no options on this lane: `childCandidatesOf`, `parentCandidatesOf` and
 *   `relationCandidatesOf` (`core/lib/utils/task-detail.ts:218-237`, `:250-257`) filter `tasksByTeamState`, the lane's
 *   team has exactly one task (`GET /api/tasks/team` answers just `Fixture active task`, `mock-gauzy-server.mjs:621`)
 *   and every filter drops that task itself, so each popup says `taskMenus.noOptions` "Nothing to pick yet"
 *   (`task-property-menu.tsx:123-128`, `:454-458`) in every case. The create row is the only difference between the
 *   five states, so each case asserts that difference together with the unchanged "Nothing to pick yet".
 *
 * ## The English, copied from `locales/en.json`
 *
 * `common.CHILD_ISSUES` `:332`, `common.RELATED_ISSUES` `:331`, `common.CREATE_TASK` `:236`,
 * `common.VERIFY_ACCOUNT_MSG` `:251`, `taskDrawer.ADD_CHILD_ISSUE` `:3914`, `taskDrawer.ADD_RELATED_ISSUE` `:3915`,
 * `taskDetail.properties.CHANGE_PARENT` `:6279`, `taskDetail.properties.SEARCH_PARENT` `:6281`,
 * `taskDetail.subtasks.SEARCH` `:6318`, `taskDetail.relations.SEARCH` `:6322`, `taskDetail.picker.CREATE` `:6272`,
 * `taskDetail.picker.CREATE_CHILD` `:6273`, `taskDetail.picker.CREATE_PARENT` `:6274`, `taskMenus.noOptions` `:3639`,
 * `form.TASK_INPUT_PLACEHOLDER` `:3430`, `pages.taskDetails.PRIORITY` `:2392`.
 *
 * ## What the runs measured, in the order the assertions now read it
 *
 * - A verified person is never asked (`case A · status asks 0` on all four gates), an unverified one is asked exactly
 *   once for B, C and D — answered 404, 200 and 200 by `stubStatus`'s own `route.fulfill`, which never asks the mock
 *   for that path, and the mock has no handler for it to answer anyway. Case E was asked 2 to 4 times, every one answered 500:
 *   the query's own retry plus `next dev`'s Strict
 *   Mode double mount, not four asks of the app. No `OPTIONS` preflight of either path was recorded (0 in every case)
 *   although both leave the page for `http://127.0.0.1:4002` directly; the answers this spec writes still carry the
 *   mock's CORS set, which is what keeps them from being discarded.
 * - Each of the three pickers held exactly one button when the gate was satisfied — the create row, spelled exactly as
 *   the locale spells it — and **no button at all** when it was refused, with "Nothing to pick yet" unchanged in both
 *   states. That is the whole of what the person gets on the task page: the action is gone and the page gives no
 *   reason, no tooltip and no notice (`grep -n Verification core/components/tasks/detail` answers only the three hook
 *   calls). The picker itself stays usable either way: its search field and its list are there in all five states.
 * - Each Kanban column offered its add twice (column add buttons 2: the header's `+` and the column's own row,
 *   `kanban-lane.tsx:140-148`, `:154-167`); its form held exactly one `Create task` button, `disabled=true` in C and E
 *   and `disabled=false` in A, B and D, with the bubble found in C and E only. The title field was enabled in every
 *   case, which is what rules out the other thing that disables that button: a running timer (`:317`, `:676`).
 * - **Measured, and it is not a defect:** the element Playwright reports as `dialog "Create task"` answers `hidden` to
 *   `toBeVisible` on this lane even while the form is plainly on screen, because the headlessui Dialog element owns no
 *   box of its own — its overlay and its panel are fixed-position children (`core/components/common/modal.tsx:70-88`).
 *   The form's presence is therefore read from its title field, and the assertions below never ask the Dialog element
 *   whether it is visible.
 * - **Measured, then pinned:** one `hover()` brought the bubble in case E but not in case C of run 2, because the form
 *   re-renders as its lazy parts arrive and replaces the Tooltip's trigger box, and a box that was never entered
 *   renders no bubble (`pauseOnButton`, above). With the repeated pause, C and E both bring it and A, B and D bring
 *   nothing in 4 s of pausing.
 * - Case D is the state the hook itself names (`email-verification.ts:13-17`): the user read still says unverified and
 *   the status, read afterwards, says verified. One moment, one source per fact, no contradiction — and it lets the
 *   person through, which is the point of reading the status at all.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The two calls these pages cause on the mock origin, watched from before the first navigation. */
const USER_PATH = '/api/user/me';
const STATUS_PATH = '/api/auth/email/verify/status';

const KANBAN_PATH = '/kanban';
const taskPath = (fixture: BootstrapFixture) => `/task/${fixture.ids.task}`;

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1004-1013`), restated on every answer this spec writes. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

const TEXT = {
	childIssues: 'Child issues',
	relatedIssues: 'Related issues',
	addChild: 'Add a child issue',
	linkRelated: 'Link a related issue',
	changeParent: 'Change parent',
	searchChild: 'Find a task to add',
	searchRelation: 'Find a task to link',
	searchParent: 'Find a parent task',
	emptyPicker: 'Nothing to pick yet',
	createTask: 'Create task',
	taskPlaceholder: 'What are you working on?',
	priority: 'Priority',
	verifyTip: 'Please Verify your account before start using the app',
	laneLabel: 'open'
};

/**
 * Typed into a picker's search field: at least 2 characters, which is what a create row needs
 * (`task-picker-menu.tsx:14`, `:41-43`), and a title no candidate can match, so the popup holds no options and its
 * footer is either the create row or nothing.
 */
const PROBE_TITLE = 'Verification gate probe 42';

/** The three create labels, spelled as `taskDetail.picker.*` spells them (the quotes are the locale's own). */
const CREATE_LABEL = {
	child: (title: string) => `Create “${title}” as a child issue`,
	relation: (title: string) => `Create “${title}”`,
	parent: (title: string) => `Create “${title}” as the parent`
};

type StubAnswer = { status: number; body: Record<string, unknown> };

/** Gauzy with FEATURE_EMAIL_VERIFICATION off answers this path 404 (email-verification.service.ts:29-30, :40-42). */
const STATUS_NOT_FOUND: StubAnswer = {
	status: 404,
	body: { statusCode: 404, message: 'Cannot GET /auth/email/verify/status' }
};
const STATUS_UNVERIFIED_CODE_SENT: StubAnswer = {
	status: 200,
	body: { isEmailVerified: false, verificationEmailSent: true }
};
const STATUS_VERIFIED_ELSEWHERE: StubAnswer = { status: 200, body: { isEmailVerified: true } };
const STATUS_OUTAGE: StubAnswer = {
	status: 500,
	body: { statusCode: 500, message: 'The verification status could not be read' }
};

type GateCase = {
	id: string;
	/** What the case says about the person, for the test title and the log line. */
	what: string;
	/** Whether the user read is stubbed to `isEmailVerified: false`. */
	unverifiedUser: boolean;
	/** The answer given to the status path, or `null` to leave it to the mock. */
	status: StubAnswer | null;
	/** What `isEmailVerificationSatisfied` must return for it (`email-verification.ts:18-30`), read case by case. */
	satisfied: boolean;
};

const CASES: GateCase[] = [
	{
		id: 'A',
		what: 'the lane person is verified (nothing stubbed)',
		unverifiedUser: false,
		status: null,
		satisfied: true
	},
	{
		id: 'B',
		what: 'unverified person + the deployment verifies no address (404)',
		unverifiedUser: true,
		status: STATUS_NOT_FOUND,
		satisfied: true
	},
	{
		id: 'C',
		what: 'unverified person + the status says so, a code already went out',
		unverifiedUser: true,
		status: STATUS_UNVERIFIED_CODE_SENT,
		satisfied: false
	},
	{
		id: 'D',
		what: 'unverified person + the status says the address is verified meanwhile',
		unverifiedUser: true,
		status: STATUS_VERIFIED_ELSEWHERE,
		satisfied: true
	},
	{
		id: 'E',
		what: 'unverified person + the status cannot be read (500, UNREADABLE_STATUS)',
		unverifiedUser: true,
		status: STATUS_OUTAGE,
		satisfied: false
	}
];

/** What one page asked of the two stubbed calls. */
type Traffic = {
	statusAsks: string[];
	/** Their answers: a status number, or 0 for a request that never got one. */
	statusAnswers: number[];
	/** `OPTIONS` preflights of the status path (a CORS artifact, not an ask of the app). */
	statusPreflights: number;
	userAsks: string[];
	/** The user answer this spec edited, as the mock really answered it. */
	mockUser: Record<string, unknown> | null;
};

const urlOf = (raw: string) => {
	try {
		return new URL(raw);
	} catch {
		return undefined;
	}
};

const isWatchedCall = (raw: string) => {
	const url = urlOf(raw);
	if (!url || url.origin !== MOCK_API_ORIGIN) return false;

	return url.pathname === USER_PATH || url.pathname === STATUS_PATH;
};

function watchTraffic(page: Page): Traffic {
	const traffic: Traffic = {
		statusAsks: [],
		statusAnswers: [],
		statusPreflights: 0,
		userAsks: [],
		mockUser: null
	};

	page.on('request', (request) => {
		if (!isWatchedCall(request.url())) return;
		const pathname = urlOf(request.url())?.pathname ?? '';
		const method = request.method();
		if (pathname === STATUS_PATH) {
			if (method === 'OPTIONS') traffic.statusPreflights += 1;
			else traffic.statusAsks.push(`${method} ${request.url()}`);
		}
		if (pathname === USER_PATH && method === 'GET') traffic.userAsks.push(request.url());
	});
	page.on('response', (response) => {
		if (!isWatchedCall(response.url())) return;
		if (urlOf(response.url())?.pathname === STATUS_PATH && response.request().method() === 'GET') {
			traffic.statusAnswers.push(response.status());
		}
	});
	page.on('requestfailed', (request) => {
		if (!isWatchedCall(request.url())) return;
		if (urlOf(request.url())?.pathname === STATUS_PATH && request.method() === 'GET') traffic.statusAnswers.push(0);
	});

	return traffic;
}

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function measure(label: string, c: GateCase, traffic: Traffic, seen: string): void {
	console.log(
		`[lane-c task gates] MEASURE ${label} · case ${c.id} (${c.what}) · satisfied ${c.satisfied} · status asks ` +
			`${traffic.statusAsks.length} ${JSON.stringify(traffic.statusAsks.map((ask) => ask.split(' ')[1]))} · answers ` +
			`${JSON.stringify(traffic.statusAnswers)} · preflights ${traffic.statusPreflights} · user asks ` +
			`${traffic.userAsks.length} · isEmailVerified as the mock answered it ` +
			`${JSON.stringify(traffic.mockUser?.isEmailVerified ?? null)} · seen ${seen}`
	);
}

/**
 * The status read a case's verdict rests on, asserted before the verdict itself: a verified person is never asked
 * (`use-email-verification-status.ts:31-35`), and an unverified one must have had the status answered — and answered
 * what this case armed — before an absent create row can be read as the gate's decision rather than a page still
 * waiting for its answer.
 */
async function expectStatusRead(c: GateCase, traffic: Traffic): Promise<void> {
	if (!c.status) {
		expect(traffic.statusAsks, `case ${c.id}: a verified person caused a status read`).toEqual([]);
		return;
	}
	const armed = c.status.status;
	await expect
		.poll(() => traffic.statusAnswers.length, {
			message: `case ${c.id}: the status read was never answered (asks ${JSON.stringify(traffic.statusAsks)})`,
			timeout: 20_000
		})
		.toBeGreaterThan(0);
	expect(
		traffic.statusAnswers.filter((answer) => answer !== armed),
		`case ${c.id}: the status read was answered something other than the armed ${armed}`
	).toEqual([]);
}

/**
 * Stubs the signed-in user as the mock's real answer with `isEmailVerified` set to false, and records the real answer
 * it edited. The mock is still asked (`route.fetch()`), so its own request log keeps showing the read.
 */
async function stubUnverifiedUser(page: Page, traffic: Traffic): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === USER_PATH,
		async (route) => {
			if (route.request().method() !== 'GET') return route.fallback();
			const real = await route.fetch();
			const original = (await real.json()) as Record<string, unknown>;
			traffic.mockUser = original;

			return route.fulfill({
				status: real.status(),
				headers: CORS_HEADERS,
				json: { ...original, isEmailVerified: false }
			});
		}
	);
}

/** Answers the status path with one fixed answer. */
async function stubStatus(page: Page, answer: StubAnswer): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === STATUS_PATH,
		(route) => {
			if (route.request().method() !== 'GET') return route.fallback();

			return route.fulfill({ status: answer.status, headers: CORS_HEADERS, json: answer.body });
		}
	);
}

/** Installs one case's stubs, then signs in and hard-loads the page: routes first, cookies second, navigation last. */
async function openGatePage(
	page: Page,
	fixture: BootstrapFixture,
	path: string,
	c: GateCase,
	traffic: Traffic
): Promise<Page> {
	if (c.unverifiedUser) await stubUnverifiedUser(page, traffic);
	if (c.status) await stubStatus(page, c.status);
	await signInAndVisit(page, fixture, path);

	return page;
}

type PickerGate = {
	/** The control the person clicks: the accessible name `triggerLabel` gives the popup's trigger
	 * (`task-property-menu.tsx:371-382`, `aria-label={triggerLabel}`). */
	triggerName: string;
	/** The search field the opened popup holds (`task-property-menu.tsx:400-416`). */
	searchName: string;
	/** The footer row the gate decides, by its exact label. */
	label: (title: string) => string;
	/** The section the gate lives in, named by its `h2`, or `null` for the parent field, which has none. */
	sectionName: string | null;
};

const PICKERS: Record<'child' | 'relation' | 'parent', PickerGate> = {
	child: {
		triggerName: TEXT.addChild,
		searchName: TEXT.searchChild,
		label: CREATE_LABEL.child,
		sectionName: TEXT.childIssues
	},
	relation: {
		triggerName: TEXT.linkRelated,
		searchName: TEXT.searchRelation,
		label: CREATE_LABEL.relation,
		sectionName: TEXT.relatedIssues
	},
	parent: {
		triggerName: TEXT.changeParent,
		searchName: TEXT.searchParent,
		label: CREATE_LABEL.parent,
		sectionName: null
	}
};

/**
 * Opens one picker of the task page and types the probe title into its search field, returning the popup
 * (`task-property-menu.tsx:392-397` marks it with `data-dropdown`).
 */
async function openPickerWithQuery(page: Page, gate: PickerGate): Promise<Locator> {
	const trigger = page.getByRole('button', { name: gate.triggerName, exact: true });
	await expect(
		trigger,
		`the task page must hold exactly one "${gate.triggerName}" control (${await trigger.count()})`
	).toHaveCount(1);
	await expect(trigger.first(), `"${gate.triggerName}" must be clickable`).toBeVisible({ timeout: 25_000 });
	await trigger.click();

	const popups = page.locator('[data-dropdown]');
	const popup = popups.filter({ has: page.getByRole('combobox', { name: gate.searchName }) });
	await expect(
		popup,
		`clicking "${gate.triggerName}" must open its picker with the search field "${gate.searchName}" (popups open: ` +
			`${await popups.count()})`
	).toHaveCount(1);

	const search = popup.getByRole('combobox', { name: gate.searchName, exact: true });
	await expect(search, `the picker's search field "${gate.searchName}" must be usable`).toBeVisible({
		timeout: 15_000
	});
	await search.fill(PROBE_TITLE);

	return popup;
}

/** Every button the open picker holds, for the log line and for a failure message. */
async function popupButtons(popup: Locator): Promise<string[]> {
	const texts = await popup.getByRole('button').allTextContents();

	return texts.map((text) => text.replace(/\s+/g, ' ').trim());
}

/**
 * What the three task-page pickers have in common: open the picker, type a title, and assert whether the create row
 * the gate decides is there. Asserted case by case in each describe below.
 */
async function expectPickerCreateRow(
	page: Page,
	fixture: BootstrapFixture,
	c: GateCase,
	gate: PickerGate
): Promise<void> {
	const traffic = watchTraffic(page);
	await openGatePage(page, fixture, taskPath(fixture), c, traffic);

	if (gate.sectionName) {
		const section = page.getByRole('region', { name: gate.sectionName, exact: true });
		await expect(
			section,
			`the task page must hold exactly one "${gate.sectionName}" section (${await section.count()})`
		).toHaveCount(1);
	}

	const popup = await openPickerWithQuery(page, gate);
	const row = popup.getByRole('button', { name: gate.label(PROBE_TITLE), exact: true });
	const empty = popup.getByText(TEXT.emptyPicker, { exact: true });
	const rows = await popupButtons(popup);
	await expect(
		empty,
		`the picker must still offer its task list, i.e. "${TEXT.emptyPicker}" (buttons ${JSON.stringify(rows)})`
	).toHaveCount(1);
	measure(
		'picker',
		c,
		traffic,
		`gate ${gate.triggerName} · buttons ${JSON.stringify(rows)} · create rows ` + `=${await row.count()}`
	);
	await expectStatusRead(c, traffic);

	if (c.satisfied) {
		await expect(
			row,
			`case ${c.id}: the person may create, so "${gate.label(PROBE_TITLE)}" must be in the picker (buttons ` +
				`${JSON.stringify(rows)})`
		).toHaveCount(1);
		await expect(row, `case ${c.id}: the create row must be clickable (${await row.innerHTML()})`).toBeEnabled();
	} else {
		await expect(
			row,
			`case ${c.id}: an unverified address holds creating back, so the picker may offer no create row (buttons ` +
				`${JSON.stringify(rows)})`
		).toHaveCount(0);
	}
}

/** Opens one Kanban column's create form through the column's own add (`kanban-lane.tsx:140-148`, `:154-167`). */
async function openKanbanColumnForm(page: Page) {
	const lane = page.getByRole('region', { name: TEXT.laneLabel, exact: true });
	await expect(
		lane,
		`the board must hold exactly one "${TEXT.laneLabel}" column (regions on the page: ` +
			`${await page.getByRole('region').count()})`
	).toHaveCount(1);

	const add = lane.getByRole('button', { name: TEXT.createTask, exact: true });
	const addCount = await add.count();
	await expect(
		add.first(),
		`the column must offer its task input "${TEXT.createTask}" (found ${addCount})`
	).toBeVisible({ timeout: 25_000 });
	await add.first().click();

	const dialogs = page.getByRole('dialog');
	await expect(dialogs, `the column's add must open exactly one dialog (${await dialogs.count()})`).toHaveCount(1);
	const named = page.getByRole('dialog', { name: TEXT.createTask, exact: true });
	await expect(
		named,
		`that dialog must carry the create form's own title "${TEXT.createTask}" (create-task-modal.tsx:25)`
	).toHaveCount(1);
	// Measured on this lane: the headlessui Dialog element owns no box of its own — its overlay and its panel are
	// fixed-position children (`core/components/common/modal.tsx:70-88`) — so `toBeVisible` on the element Playwright
	// reports as `dialog "Create task"` reads "hidden" even while the form is plainly on screen. What is on screen is
	// read from the field inside it, which is also what the person needs.
	const dialog = dialogs.first();
	const titleField = dialog.getByRole('textbox', { name: TEXT.taskPlaceholder, exact: true });
	await expect(
		titleField,
		`the create form must be on screen with its title field (found ${await titleField.count()}; the dialog holds ` +
			`${JSON.stringify((await dialog.allInnerTexts()).join(' ').replace(/\s+/g, ' ').trim().slice(0, 200))})`
	).toBeVisible({ timeout: 30_000 });

	return { addCount, dialog, titleField };
}

test.describe('lane-c · the subtask picker of a task page (task-detail-subtasks.tsx:60-65)', () => {
	for (const c of CASES) {
		test(`subtasks · ${c.id} ${c.what} → ${c.satisfied ? 'the create row is there' : 'no create row at all'}`, async ({
			page,
			fixture
		}) => {
			await expectPickerCreateRow(page, fixture, c, PICKERS.child);
		});
	}
});

test.describe('lane-c · the related-issue picker of a task page (task-detail-relations.tsx:155-159)', () => {
	for (const c of CASES) {
		test(`related issues · ${c.id} ${c.what} → ${c.satisfied ? 'the create row is there' : 'no create row at all'}`, async ({
			page,
			fixture
		}) => {
			await expectPickerCreateRow(page, fixture, c, PICKERS.relation);
		});
	}
});

test.describe('lane-c · the parent picker of a task page (task-parent-field.tsx:52-56)', () => {
	for (const c of CASES) {
		test(`parent · ${c.id} ${c.what} → ${c.satisfied ? 'the create row is there' : 'no create row at all'}`, async ({
			page,
			fixture
		}) => {
			await expectPickerCreateRow(page, fixture, c, PICKERS.parent);
		});
	}
});

/**
 * Keeps the person's pause on the create button until the bubble answers, and reports whether one ever came.
 *
 * Measured on this lane (run 2, case C): a single `hover()` left the button refused (`disabled=true`) but the bubble
 * never appeared, while the identical shape in case E showed it. The form re-renders while its lazy parts arrive (the
 * description editor and the property row come in with `hasCreateForm`, `task-input-kanban.tsx:579-596`, `:601-641`),
 * which replaces the Tooltip's trigger box; a box that was never entered renders no bubble at all
 * (`duplicated-components/tooltip.tsx:38-75`, whose `delayShow = TOOLTIP_DELAY_MS` is 400 ms, `:27`, `:40`). So the
 * pause is repeated — pointer away, pointer back onto the box, longer than that delay — exactly as a person who is
 * still deciding keeps their mouse on a button. It asserts nothing weaker: the same bubble must come.
 */
async function pauseOnButton(page: Page, box: Locator, tip: Locator, budgetMs: number): Promise<boolean> {
	const deadline = Date.now() + budgetMs;
	while (Date.now() < deadline) {
		await page.mouse.move(2, 2);
		await box.hover();
		await page.waitForTimeout(1_000);
		if (await tip.count()) return true;
	}

	return false;
}

/**
 * The Kanban column's task input: the person opens it from the column, types a title, and the gate decides whether the
 * form's `Create task` button can be used and whether a bubble says why it cannot (`task-input-kanban.tsx:645-666`,
 * `:672-677`). The typed title is what makes the create form exist at all (`use-task-input.ts:138-149`), and the
 * property row it brings (`task-input-kanban.tsx:601-641`) is the witness that the form is showing — so a refused
 * button here can only be the verification gate, never a form that never appeared. The title field is also asserted
 * enabled, because a running timer would disable that field and that button alike (`:317`, `:676`) and these cases
 * start no timer.
 */
test.describe('lane-c · the Kanban column task input (task-input-kanban.tsx:645-677)', () => {
	for (const c of CASES) {
		test(
			`kanban column · ${c.id} ${c.what} → Create task ${c.satisfied ? 'usable' : 'refused'}, tooltip ` +
				`${c.satisfied ? 'absent' : 'shown'}`,
			async ({ page, fixture }) => {
				const traffic = watchTraffic(page);
				await openGatePage(page, fixture, KANBAN_PATH, c, traffic);

				const { addCount, dialog, titleField } = await openKanbanColumnForm(page);
				await expect(
					titleField,
					`the create form must hold exactly one title field (found ${await titleField.count()})`
				).toHaveCount(1);
				await expect(titleField, 'the title field must be usable, i.e. no timer is running').toBeEnabled();
				await titleField.fill(PROBE_TITLE);

				const formRow = dialog.getByText(TEXT.priority);
				await expect(
					formRow,
					`typing a title must open the create form with its property row (the dialog says ` +
						`${JSON.stringify((await dialog.allInnerTexts()).join(' ').replace(/\s+/g, ' ').trim().slice(0, 300))})`
				).toBeVisible({ timeout: 25_000 });

				const create = dialog.getByRole('button', { name: TEXT.createTask });
				const tip = dialog.getByText(TEXT.verifyTip);
				// The Tooltip's own trigger box (`duplicated-components/tooltip.tsx:46-50` wraps the child in a div); the
				// bubble it renders sits next to that box, inside the form's footer, still inside the dialog. With the
				// gate satisfied the Tooltip is `enabled={false}` and renders its children alone, so the same xpath step
				// lands on the footer box and there is no box of its own to pause on.
				const pauseBox = create.first().locator('xpath=..');
				const dialogButtons = (await dialog.getByRole('button').allTextContents()).map((text) =>
					text.replace(/\s+/g, ' ').trim()
				);
				measure(
					'kanban column',
					c,
					traffic,
					`column add buttons ${addCount} · dialog buttons ${JSON.stringify(dialogButtons)} · Create task ` +
						`buttons ${await create.count()} disabled=${await create.first().isDisabled()} · tooltip elements ` +
						`${await tip.count()}`
				);

				await expect(
					create.first(),
					`the form must hold a "${TEXT.createTask}" button (buttons ${JSON.stringify(dialogButtons)})`
				).toBeVisible();
				await expectStatusRead(c, traffic);

				if (c.satisfied) {
					await expect(
						create.first(),
						`case ${c.id}: the person may create a task, so the button must be usable (` +
							`${await create.first().innerHTML()})`
					).toBeEnabled();
					const shown = await pauseOnButton(page, pauseBox, tip, 4_000);
					measure('kanban column tooltip', c, traffic, `bubble after a 4 s pause ${shown}`);
					await expect(
						tip,
						`case ${c.id}: nothing is being asked of this person, so the form must hold no ` +
							`"${TEXT.verifyTip}" bubble`
					).toHaveCount(0);
				} else {
					await expect(
						create.first(),
						`case ${c.id}: an unverified address holds task creation back, so the button must be refused (` +
							`${await create.first().innerHTML()})`
					).toBeDisabled();
					const shown = await pauseOnButton(page, pauseBox, tip, 25_000);
					measure('kanban column tooltip', c, traffic, `bubble after the pause ${shown}`);
					expect(shown, `case ${c.id}: a pause on the refused button must bring "${TEXT.verifyTip}"`).toBe(
						true
					);
					await expect(tip.first(), `case ${c.id}: the bubble that came must be on screen`).toBeVisible();
				}
			}
		);
	}
});

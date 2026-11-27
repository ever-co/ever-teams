import { expect, test, type Page } from '../../fixtures';
import type { Locator } from '@playwright/test';

import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person who is not verified can and cannot do, pinned on lane-b (app 3032, mock 3996) on 2026-11-23, in the
 * runs `E:\Coding\.tmp\s2-lane-b-gates-*.log`. Every number, URL and string below was read out of the code and then
 * measured in this file's own runs; each `MEASURE` line prints what the page and the network actually did, so the
 * assertions can be re-checked against the log.
 *
 * ## The gate these tests measure
 *
 * - `core/lib/auth/email-verification.ts` (47 lines, read whole): `isEmailVerificationSatisfied(user, state)` returns
 *   `false` with no user (`:19-21`), `true` when the user's own flag says verified (`:22-24`), `true` when
 *   `state === null` — the deployment that verifies no address (`:25-27`) — and otherwise
 *   `state?.isEmailVerified === true` (`:29`).
 *   `asksForEmailVerification` is true only for an unverified user **and** a status that says so (`:36-42`).
 * - `core/hooks/auth/use-email-verification-status.ts`: the status is asked only while the user is unverified
 *   (`:31` `isUnverified`, `:35` `enabled`), so a verified person never causes the call; a 404 becomes `null` in the
 *   service, not here; `UNREADABLE_STATUS = { isEmailVerified: false }` (`:23`) is returned only when the query errored
 *   and has no data yet (`:38-41`), which is what an outage does to a person: held back and asked to verify, exactly as
 *   before the app read the status at all.
 * - `core/services/client/api/users/emails/email-verification.service.ts`: the ask is `GET '/auth/email/verify/status'`
 *   when `GAUZY_API_BASE_SERVER_URL.value` is set (`:30`) and a 404 is answered `null` (`:40-42`); `errorStatusOf`
 *   reads the status off the axios error (`core/lib/utils/error-feedback.ts:58-71`).
 * - `core/constants/config/constants.tsx:229` builds `GAUZY_API_BASE_SERVER_URL` from
 *   `NEXT_PUBLIC_GAUZY_API_SERVER_URL`, which `playwright/test-servers.ts:109` sets to the mock origin (while `:111`
 *   leaves `NEXT_PUBLIC_GAUZY_API_BASE_SERVER_URL` empty), and `core/services/client/axios.ts:108-112` makes the
 *   browser's base `<mock origin>/api`. Measured below from the browser's own request log: on a lane both the user read
 *   and the status read leave the browser for the mock directly, one hop.
 *
 * ## Why the mock cannot show any of this by itself
 *
 * The lane mock's users are always verified (`cypress/support/mock-gauzy-server.mjs:91`, `:108`, `:119`; `/api/user/me`
 * is answered at `:415` and `:544` with that user), and the mock has **no handler** for the status path —
 * `grep -n "verify" cypress/support/mock-gauzy-server.mjs` answers nothing — so its fall-through for a GET path it
 * does not know is an empty page (`mock-gauzy-server.mjs:806`), which `emailVerificationStatusSchema`
 * (`core/types/schemas/auth/email-verification.schema.ts:24-27`) rejects. So the user is stubbed by taking the mock's
 * real answer and changing only `isEmailVerified` (every other field the pages read stays the lane's own), and the
 * status is answered by this spec.
 *
 * Both calls are cross-origin (page on `http://localhost:3032`, API on `http://127.0.0.1:3996`), so an answer this spec
 * writes itself must carry the CORS headers the mock writes — `mock-gauzy-server.mjs:997-1006`, measured live against
 * this lane's mock with an `OPTIONS` of the status path: 204 with exactly the set below, echoing
 * `http://localhost:3032`. Without them the browser discards the answer and the request becomes an error, which would
 * silently turn cases B, C and D into the outage case. The `OPTIONS` of each stubbed path is left to the mock
 * (`route.fallback()`).
 *
 * ## The four gates this file reaches, and the element each one is about
 *
 * - `core/components/teams/teams-dropdown.tsx` (rendered by `default-layout/navbar.tsx:138`, in the bar every
 *   `PageLayout` page carries): `cannotCreateTeam = !meetsEmailVerification || blocksTeamChange` (`:170`) on the
 *   `Create new team` row (`:361-368`), and a tooltip `enabled={!meetsEmailVerification}` around it (`:356-360`) whose
 *   label is `common.VERIFY_ACCOUNT_MSG`.
 * - `core/components/settings/pages/members/members-settings-page.tsx`: `canInvite = isEmailVerificationSatisfied(user,
 *   verificationState)` (`:58`) on the page's `Invite` button (`:77-80`) and on the section-level ones it passes down
 *   (`:85-86`), and `{asksForVerification && <UnverifiedNotice />}` (`:84`), whose title and action come from
 *   `settings.members.UNVERIFIED_TITLE` / `_ACTION` (`:34-49`).
 * - `core/components/tasks/task-input.tsx`: the `Create task` button is `disabled` when `!datas.meetsEmailVerification`
 *   (`:811-812`), wrapped in a tooltip `enabled={!datas.meetsEmailVerification}` (`:802-805`), and
 *   `useTaskInput` refuses the creation itself (`core/hooks/tasks/use-task-input.ts:161`).
 * - `core/components/pages/kanban/board/kanban-page.tsx`: `showsInvite = isInviteOpen && meetsEmailVerification`
 *   (`:239`), the invite modal of a click on the toolbar's `Invite` (`:255-258`, `:317`). Here the toolbar button is
 *   gated by team-manager status (`canInvite`, `:166`), so what the verification gate decides is whether the click
 *   actually opens the modal — pinned as such below.
 *
 * The English is copied from `locales/en.json`: `common.INVITE` `:147`, `common.CREATE_TASK` `:236`,
 * `common.CREATE_TEAM` `:248`, `common.VERIFY_ACCOUNT_MSG` `:251`, `pages.kanban.KANBAN_BOARD` `:2363`,
 * `modals.invite.TITLE` `:3788`, `form.TASK_INPUT_PLACEHOLDER` `:3430`, `settings.entries.members.TITLE` `:4705`,
 * `settings.members.UNVERIFIED_TITLE` `:5453`, `_DESCRIPTION` `:5454`, `_ACTION` `:5455`.
 *
 * lane-b was started with a Board domain (`E2E_BOARD_APP_DOMAIN=http://localhost:3032`); nothing on these four pages
 * asks for it — measured in the request logs below.
 *
 * ## What these runs measured, and why the assertions are worded as they are
 *
 * - The status is asked only of an unverified person: case A asked it 0 times on every page, cases B, C and D once,
 *   and case E twice on Settings › Members and on `/kanban`, three to five times on the home page — the extras are
 *   the query's `retry: 1` (`core/query/config/index.ts:31`) against the 500 with `next dev`'s Strict Mode double
 *   mount, not reads the app asked for. One run answered a first ask with `0`, a read the page canceled itself (the
 *   cancellation the harness already lists as known noise, `playwright/helpers.ts:43`), with the real answer next —
 *   so every ask count below is "at least one", never "exactly one".
 * - A refused menu row carries `aria-disabled="true"` and a usable one carries none, both under
 *   `data-slot="dropdown-menu-item"`; that is what `toBeDisabled` / `toBeEnabled` read here.
 * - Settings › Members holds exactly one `Invite` button on this lane's data: the page action. The section-level ones
 *   this page passes `canInvite` down to (`:85-86`, `MembersSection`, `PendingInvitationsSection`) render none of their
 *   own with the mock's fixture team, so the loop below asserts on the one the page actually offers.
 * - No `OPTIONS` preflight of these two paths was recorded on this lane (the counter reads 0 in every case) although
 *   both calls leave the page for `http://127.0.0.1:3996` directly; the answers this spec writes still carry the mock's
 *   CORS headers, which is what keeps them from being discarded as a failed read.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The two calls these pages cause on the mock origin, measured from the browser's own request log. */
const USER_PATH = '/api/user/me';
const STATUS_PATH = '/api/auth/email/verify/status';

const HOME_PATH = '/';
const MEMBERS_PATH = '/settings/team/members';
const KANBAN_PATH = '/kanban';

/** The mock's own CORS answer (`mock-gauzy-server.mjs:997-1006`, measured live on this lane). */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

const TEXT = {
	invite: 'Invite',
	createTeam: 'Create new team',
	createTask: 'Create task',
	verifyTip: 'Please Verify your account before start using the app',
	noticeTitle: 'Verify your email address to invite people',
	noticeDescription: 'Invitations go out once your address is verified.',
	noticeAction: 'Open your profile',
	inviteDialogTitle: 'Invite people',
	taskPlaceholder: 'What are you working on?'
};

/** A task title the lane's own task list cannot match, so the task picker shows its create form. */
const CREATE_QUERY = 'Verification gate probe 42';

type StubAnswer = { status: number; body: Record<string, unknown> };

/** Gauzy with FEATURE_EMAIL_VERIFICATION off answers this path 404 (email-verification.service.ts:24-27, :40-42). */
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
	/** What `asksForEmailVerification` must return for it (`email-verification.ts:36-42`). */
	asks: boolean;
};

const CASES: GateCase[] = [
	{
		id: 'A',
		what: 'the lane person is verified (nothing stubbed)',
		unverifiedUser: false,
		status: null,
		satisfied: true,
		asks: false
	},
	{
		id: 'B',
		what: 'unverified person + the deployment verifies no address (404)',
		unverifiedUser: true,
		status: STATUS_NOT_FOUND,
		satisfied: true,
		asks: false
	},
	{
		id: 'C',
		what: 'unverified person + the status says so, a code already went out',
		unverifiedUser: true,
		status: STATUS_UNVERIFIED_CODE_SENT,
		satisfied: false,
		asks: true
	},
	{
		id: 'D',
		what: 'unverified person + the status says the address is verified meanwhile',
		unverifiedUser: true,
		status: STATUS_VERIFIED_ELSEWHERE,
		satisfied: true,
		asks: false
	},
	{
		id: 'E',
		what: 'unverified person + the status cannot be read (500, UNREADABLE_STATUS)',
		unverifiedUser: true,
		status: STATUS_OUTAGE,
		satisfied: false,
		asks: true
	}
];

/** What one page asked of the two stubbed calls, watched from before its first navigation. */
type Traffic = {
	/** `GET` asks of the status path, oldest first, with the full URL the browser sent. */
	statusAsks: string[];
	/** Their answers: a status number, or 0 for a request that never got one. */
	statusAnswers: number[];
	/** `OPTIONS` preflights of the status path (a CORS artifact, not an ask of the app). */
	statusPreflights: number;
	/** `GET` asks of the user path. */
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
		`[lane-b gates] MEASURE ${label} · case ${c.id} (${c.what}) · status asks ${traffic.statusAsks.length} ` +
			`${JSON.stringify(traffic.statusAsks.map((ask) => ask.split(' ')[1]))} · answers ` +
			`${JSON.stringify(traffic.statusAnswers)} · preflights ${traffic.statusPreflights} · user asks ` +
			`${JSON.stringify(traffic.userAsks)} · isEmailVerified as the mock answered it ` +
			`${JSON.stringify(traffic.mockUser?.isEmailVerified ?? null)} · seen ${seen}`
	);
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

/**
 * Opens a signed-in page with one case's stubs installed **before** the navigation: `signInAndVisit` (helpers.ts) is
 * the fixtures' own order for a spec that must intercept a call before the page loads — routes first, cookies second,
 * navigation last.
 */
async function openGatePage(
	page: Page,
	fixture: BootstrapFixture,
	path: string,
	c: GateCase,
	traffic: Traffic
): Promise<void> {
	if (c.unverifiedUser) await stubUnverifiedUser(page, traffic);
	if (c.status) await stubStatus(page, c.status);
	await signInAndVisit(page, fixture, path);
}

/** The header's team switcher: the bar's trigger that opens the team menu. */
function teamsTrigger(page: Page, fixture: BootstrapFixture): Locator {
	return page.getByRole('button', { name: new RegExp(fixture.names.teamA) });
}

/** Opens the team menu and returns its `Create new team` row. */
async function openCreateTeamRow(page: Page, fixture: BootstrapFixture): Promise<Locator> {
	const trigger = teamsTrigger(page, fixture);
	await expect(trigger, 'the bar must offer exactly one team switcher to click').toHaveCount(1);
	await trigger.click();

	const row = page.getByRole('menuitem', { name: TEXT.createTeam });
	await expect(row, `the opened team menu must hold exactly one "${TEXT.createTeam}" row`).toHaveCount(1);

	return row;
}

/** The `Create team` gate in the header's team menu: the row is there in every case; only its state changes. */
test.describe('lane-b · the team menu of the header (teams-dropdown.tsx:170, :356-368)', () => {
	for (const c of CASES) {
		test(`team menu · ${c.id} ${c.what} → Create new team ${c.satisfied ? 'usable' : 'refused'}`, async ({
			page,
			fixture
		}) => {
			const traffic = watchTraffic(page);
			await openGatePage(page, fixture, HOME_PATH, c, traffic);

			const row = await openCreateTeamRow(page, fixture);
			measure(
				'teams dropdown',
				c,
				traffic,
				`row ${await row.getAttribute('data-slot')} · aria-disabled=` +
					`${JSON.stringify(await row.getAttribute('aria-disabled'))}`
			);

			await expect(row).toBeVisible();
			if (c.satisfied) {
				await expect(
					row,
					`case ${c.id}: the person may create a team, so the row must be usable (${await row.innerHTML()})`
				).toBeEnabled();
			} else {
				await expect(
					row,
					`case ${c.id}: an unverified address holds the action back, so the row must be refused (` +
						`${await row.innerHTML()})`
				).toBeDisabled();
			}
		});
	}

	test('team menu · the refused row says why, on a pause over it (teams-dropdown.tsx:356-360)', async ({
		page,
		fixture
	}) => {
		const c = CASES.find((item) => item.id === 'C') ?? CASES[0];
		const traffic = watchTraffic(page);
		await openGatePage(page, fixture, HOME_PATH, c, traffic);

		const row = await openCreateTeamRow(page, fixture);
		await expect(row, 'the case this test is about must be a refused one').toBeDisabled();

		// The tooltip's trigger is the box the row sits in (`duplicated-components/tooltip.tsx:46-50` wraps the child in
		// a div), and a refused row sets `data-disabled:pointer-events-none` (the shared menu-item recipe in
		// `common/dropdown-menu.tsx`), so the pause has to be on that box rather than on the row itself.
		await row.locator('xpath=..').hover();
		const tip = page.getByText(TEXT.verifyTip);
		await expect(
			tip,
			`a pause over the refused row must show "${TEXT.verifyTip}" (the row is ${await row.innerHTML()})`
		).toBeVisible({ timeout: 10_000 });
		measure('teams dropdown tooltip', c, traffic, `tooltip text ${JSON.stringify(await tip.textContent())}`);
	});
});

/** Settings › Members: the page's own `Invite` action and the notice develop added for an unverified address. */
test.describe('lane-b · Settings › Members (members-settings-page.tsx:58, :77-84)', () => {
	for (const c of CASES) {
		test(
			`Settings › Members · ${c.id} ${c.what} → Invite ${c.satisfied ? 'usable' : 'refused'}, notice ` +
				`${c.asks ? 'shown' : 'absent'}`,
			async ({ page, fixture }) => {
				const traffic = watchTraffic(page);
				await openGatePage(page, fixture, MEMBERS_PATH, c, traffic);

				const buttons = page.getByRole('button', { name: TEXT.invite, exact: true });
				await expect(buttons.first(), 'the members page must offer its Invite action').toBeVisible({
					timeout: 20_000
				});
				const count = await buttons.count();
				const notice = page.getByText(TEXT.noticeTitle);
				measure(
					'members invite',
					c,
					traffic,
					`Invite buttons ${count} · notice ${await notice.count()} · disabled states ` +
						`${JSON.stringify(
							await Promise.all(
								Array.from({ length: count }, async (_, index) => await buttons.nth(index).isDisabled())
							)
						)}`
				);

				for (let index = 0; index < count; index += 1) {
					const button = buttons.nth(index);
					if (c.satisfied) {
						await expect(
							button,
							`case ${c.id}: the ${index + 1}. Invite action on the page must be usable`
						).toBeEnabled();
					} else {
						await expect(
							button,
							`case ${c.id}: the ${index + 1}. Invite action on the page must be refused`
						).toBeDisabled();
					}
				}

				if (c.asks) {
					await expect(notice, `case ${c.id}: the page must say why invitations are held back`).toHaveText(
						TEXT.noticeTitle
					);
					await expect(
						page.getByText(TEXT.noticeDescription),
						`case ${c.id}: the notice must carry its own sentence`
					).toHaveText(TEXT.noticeDescription);
					await expect(
						page.getByRole('link', { name: TEXT.noticeAction }),
						`case ${c.id}: the notice must offer its way out (${TEXT.noticeAction})`
					).toBeVisible();
				} else {
					await expect(
						notice,
						`case ${c.id}: nothing is being asked of this person, so no notice may stand on the page`
					).toHaveCount(0);
				}
			}
		);
	}
});

/** The timer's task picker: its create form and the `Create task` button inside it. */
test.describe('lane-b · the task picker of the timer (task-input.tsx:802-812, use-task-input.ts:161)', () => {
	for (const c of CASES) {
		test(`task picker · ${c.id} ${c.what} → Create task ${c.satisfied ? 'usable' : 'refused'}`, async ({
			page,
			fixture
		}) => {
			const traffic = watchTraffic(page);
			await openGatePage(page, fixture, HOME_PATH, c, traffic);

			const input = page.getByRole('textbox', { name: TEXT.taskPlaceholder });
			await expect(input, 'the timer must offer its task field').toBeVisible({ timeout: 20_000 });
			// The field starts holding the fixture task's own title; only a title the team's list cannot match makes the
			// picker show its create form at all (`use-task-input.ts:144-150`), so type one and do not press Enter.
			await input.click();
			await input.fill(CREATE_QUERY);

			const button = page.getByRole('button', { name: TEXT.createTask, exact: true });
			await expect(
				button,
				`typing "${CREATE_QUERY}" must bring the picker's create form (buttons found: ` +
					`${await button.count()})`
			).toHaveCount(1);
			measure('task picker', c, traffic, `Create task disabled=${await button.isDisabled()}`);

			if (c.satisfied) {
				await expect(
					button,
					`case ${c.id}: the person may create a task (${await button.innerHTML()})`
				).toBeEnabled();
			} else {
				await expect(
					button,
					`case ${c.id}: an unverified address holds task creation back (${await button.innerHTML()})`
				).toBeDisabled();
			}
		});
	}
});

/**
 * The kanban board's invite. The toolbar button itself is gated by team-manager status (`kanban-page.tsx:166`
 * `canInvite`, from `hooks/invitations/use-can-invite-to-active-team.ts`), so the verification gate is measured where
 * the code puts it: `showsInvite = isInviteOpen && meetsEmailVerification` (`:239`) decides whether the click the
 * person makes actually opens the modal (`:317`).
 */
test.describe('lane-b · the kanban board invite (kanban-page.tsx:239, :317)', () => {
	for (const c of CASES) {
		test(`kanban · ${c.id} ${c.what} → the invite click ${c.satisfied ? 'opens the modal' : 'opens nothing'}`, async ({
			page,
			fixture
		}) => {
			const traffic = watchTraffic(page);
			await openGatePage(page, fixture, KANBAN_PATH, c, traffic);

			const invite = page.getByRole('button', { name: TEXT.invite, exact: true }).first();
			await expect(
				invite,
				'the board must offer its Invite action to this manager (otherwise this gate is not reachable on the lane)'
			).toBeVisible({ timeout: 20_000 });
			await invite.click();

			// Give the dynamic import of the modal its chance before claiming it never came (`kanban-page.tsx:317` renders
			// it only while `showsInvite` holds).
			await page.waitForTimeout(1_500);
			const dialog = page.getByRole('dialog').filter({ hasText: TEXT.inviteDialogTitle });
			measure('kanban invite', c, traffic, `invite dialogs ${await dialog.count()}`);

			if (c.satisfied) {
				await expect(dialog, `case ${c.id}: the click must open "${TEXT.inviteDialogTitle}"`).toHaveCount(1);
			} else {
				await expect(
					dialog,
					`case ${c.id}: the same click must open nothing for an unverified person`
				).toHaveCount(0);
			}
		});
	}
});

/** The status call itself, seen from the page: who is asked, how often, and what the mock never sees. */
test.describe('lane-b · the status read behind all four gates (use-email-verification-status.ts:31-41)', () => {
	test('a verified person is never asked; an unverified one is, and only this spec answers it', async ({
		page,
		fixture,
		mock
	}) => {
		const verifiedTraffic = watchTraffic(page);
		await openGatePage(page, fixture, HOME_PATH, CASES[0], verifiedTraffic);
		const verifiedAsks = verifiedTraffic.statusAsks.length;

		const unverified = CASES.find((item) => item.id === 'C') ?? CASES[0];
		const unverifiedTraffic = watchTraffic(page);
		await openGatePage(page, fixture, MEMBERS_PATH, unverified, unverifiedTraffic);

		// The mock was never asked about the verification status: the answers these cases use are the spec's own, and the
		// only read that reached it is the user read the spec edited (`mock-gauzy-server.mjs:415`, `:544`).
		const mockStatusAsks = (await mock.calls(STATUS_PATH)).filter((request) => request.method === 'GET');
		const mockUserAsks = (await mock.calls(USER_PATH)).filter((request) => request.method === 'GET');
		measure(
			'status reads',
			unverified,
			unverifiedTraffic,
			`verified page asked ${verifiedAsks} times · unverified page asked ` +
				`${unverifiedTraffic.statusAsks.length} times answering ${JSON.stringify(unverifiedTraffic.statusAnswers)} · ` +
				`the mock itself saw ${mockStatusAsks.length} status asks and ${mockUserAsks.length} user asks`
		);

		const asks = JSON.stringify(unverifiedTraffic.statusAsks);
		const answers = JSON.stringify(unverifiedTraffic.statusAnswers);
		const paths = JSON.stringify(trafficUrlsOnMockOrigin(unverifiedTraffic));
		const mockStatusWitness = JSON.stringify(mockStatusAsks);
		const mockUserWitness = JSON.stringify(mockUserAsks);

		expect(verifiedAsks, 'a verified address needs no status call at all (:31, :35)').toBe(0);
		expect(
			unverifiedTraffic.statusAsks.length,
			`an unverified person must be asked (${asks})`
		).toBeGreaterThanOrEqual(1);
		expect(
			unverifiedTraffic.statusAnswers.includes(200),
			`the answer this spec gave must be the one the page saw (${answers})`
		).toBe(true);
		expect(
			trafficUrlsOnMockOrigin(unverifiedTraffic),
			`both reads must go to the mock origin directly, not through the app's own route handler (${paths})`
		).toEqual(expect.arrayContaining([STATUS_PATH, USER_PATH].map((path) => expect.stringContaining(path))));
		expect(
			mockStatusAsks,
			`the status path was answered by this spec, so the mock must not have seen it (${mockStatusWitness})`
		).toEqual([]);
		expect(
			mockUserAsks.length,
			`the user read still reaches the mock, so the person's other fields stay the lane's own (${mockUserWitness})`
		).toBeGreaterThanOrEqual(1);
	});
});

/** The paths of the calls a page caused on the mock origin, oldest first. */
function trafficUrlsOnMockOrigin(traffic: Traffic): string[] {
	return [
		...traffic.statusAsks.map((ask) => urlOf(ask.split(' ')[1])?.pathname ?? ''),
		...traffic.userAsks.map((ask) => urlOf(ask)?.pathname ?? '')
	];
}

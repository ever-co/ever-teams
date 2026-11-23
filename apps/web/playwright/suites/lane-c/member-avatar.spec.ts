import { expect, test } from '../../fixtures';
import type { Locator, Page } from '@playwright/test';

import { MOCK_ORIGIN } from '../../test-servers';

/**
 * A member's avatar on the team page (`/`), driven from the answer the mock gives for that member.
 *
 * Measured on lane-c (app 3033, mock 4002) on 2026-11-23: the DOM, the requests and the rendered initials every
 * claim below repeats were read off the probes `E:\Coding\.tmp\s2-probe-1.log` … `s2-probe-6.log`, and the runs of
 * this file are `E:\Coding\.tmp\s2-lane-c-avatar-<n>.log`.
 *
 * ## The page, the read that feeds it, and the fields it reads
 *
 * `app/[locale]/page-component.tsx:175` renders `LazyTeamMembers` on `/`; `team-members.tsx:81-103` picks the view
 * out of `IssuesView` (`core/constants/config/constants.tsx:597-602`), default `CARDS` (`team-members.tsx:42`), and
 * `page-component.tsx:83-91` re-applies `localStorage`'s `LAST_SELECTED_TEAM_MEMBERS_VIEW_MODE`
 * (`constants.tsx:692`) — which is why the `Cards` / `Table` / `Blocks` buttons
 * (`button[role=tab]`, `aria-label` `Cards`, `Table`, `Blocks`, `Kanban`; measured) switch it live.
 *
 * All three views render `MemberAvatar`, and the table one does it through the *card's* component:
 * `team-member-cells.tsx:17` imports `UserInfo` from `../user-team-card/user-info` and renders it at `:217`, next to
 * `team-members-card-view.tsx:144` (`UserTeamCard`) and `team-members-block-view.tsx:83` (`UserTeamBlock`).
 *
 * The members arrive in two reads the browser sends straight to the mock (direct mode, as
 * `suites/lane-a/timer-journey.spec.ts` measured for the timer):
 *
 *   `GET <mock>/api/organization-team?where[organizationId]=…&relations[]=members&relations[]=members.employee.user…`
 *   `GET <mock>/api/organization-team/<teamId>?…`
 *
 * answered by `cypress/support/mock-gauzy-server.mjs:592` (`pagination([data.team])`, i.e. `{ items: [team], total: 1 }`
 * — `:9`) and `:593` (the team itself). In both, a member's identity is `member.employee.user`
 * (`use-member-identity.ts:24`), so `fullname` is `memberUser.firstName + ' ' + memberUser.lastName`
 * (`user-team-card/user-info.tsx:26`, `user-team-block/user-info.tsx:21`) and the address is
 * `memberUser.image?.thumbUrl || memberUser.image?.fullUrl || memberUser.imageUrl || ''`
 * (`user-team-card/user-info.tsx:30-32`, `user-team-block/user-info.tsx:23-25`). Every case below is driven by
 * rewriting those fields of the mock's own answer with `page.route`, never by editing the mock.
 *
 * The mock's three fixture users carry **no `imageUrl` at all** (`grep -c imageUrl cypress/support/mock-gauzy-server.mjs`
 * answers `0`), so control case 1 is an initial today, and it stays one for the name cases.
 *
 * ## How an image is asked for, and what a failure looks like
 *
 * `MemberAvatar` hands a valid address to `Avatar` (`member-avatar.tsx:16-27`), which renders `next/image`
 * (`duplicated-components/avatar.tsx:99-112`), so the browser never fetches the member's address itself: it fetches
 * `/_next/image?url=<that address>&w=…&q=…` from the app origin. `isValidUrl` (`core/lib/utils/is-valid-url.ts:1-7`,
 * a bare `new URL`) gates whether an `<Image>` is rendered at all, so an address that is not one causes **no request**.
 * `cdn.ever.co` is used as the image host because `image-hosts.js:46` puts it in `DEFAULT_IMAGE_HOSTS`, which
 * `next.config.js:41-54` freezes into `images.remotePatterns` — a host outside that list is refused by `next/image`
 * before any request is sent.
 *
 * `Avatar` keeps a failed address out of the DOM (`avatar.tsx:66-70`, `onError` at `:110`) and shows the `fallback`
 * `MemberAvatar` passed it (`member-avatar.tsx:26`).
 *
 * Two measurements shaped how these cases are written:
 *
 * - Each member is rendered **twice** in the cards markup — the wide row and the stacked variant
 *   (`user-team-card/index.tsx:278` and `:390`) — and at 1280×900 the second one is `display:none`. A hidden copy
 *   never loads its lazy image, so it keeps its `<img>` even after the visible one fell back; every assertion here
 *   is therefore scoped to the copy that is on screen (`visible=true`) and to `getByRole`, which skips the hidden
 *   subtree (measured: 0 role matches for a member whose visible avatar fell back, while its hidden copy still held
 *   an `<img>`).
 * - A 404 whose body is a *valid PNG* left the image element in place (probe 5, `404-png-body`); a 404 that answers
 *   plainly is what makes `next/image` fire its `onError`. The stub below answers plainly.
 */

// ------------------------------------------------------------------ the member, and the answer it came from

type MemberPatch = { firstName?: string; lastName?: string; imageUrl?: string | null };

type GauzyTeam = { members?: Array<{ employee?: { user?: Record<string, unknown> } }> };
type TeamRead = GauzyTeam & { items?: GauzyTeam[] };

/** The two reads whose answer carries the team's members. Not `/api/organization-team-employee/…`, which has more segments. */
const teamMembersRead = (url: URL): boolean =>
	url.origin === new URL(MOCK_ORIGIN).origin &&
	(url.pathname === '/api/organization-team' || /^\/api\/organization-team\/[^/]+$/.test(url.pathname));

/** Rewrites one fixture member inside whatever the mock answered, and hands the answer on with its own status. */
function patchMember(read: TeamRead, memberUserId: string, patch: MemberPatch): TeamRead {
	for (const team of Array.isArray(read.items) ? read.items : [read]) {
		for (const member of team.members ?? []) {
			const user = member.employee?.user;
			if (!user || user.id !== memberUserId) continue;
			if (patch.firstName !== undefined) user.firstName = patch.firstName;
			if (patch.lastName !== undefined) user.lastName = patch.lastName;
			if (patch.imageUrl !== undefined) user.imageUrl = patch.imageUrl;
		}
	}
	return read;
}

async function serveMember(page: Page, memberUserId: string, patch: MemberPatch): Promise<void> {
	await page.route(teamMembersRead, async (route) => {
		const upstream = await route.fetch();
		if (!upstream.ok()) {
			await route.fulfill({ response: upstream });
			return;
		}
		await route.fulfill({ response: upstream, json: patchMember(await upstream.json(), memberUserId, patch) });
	});
}

// ------------------------------------------------------------------ the avatar, as the browser rendered it

/** The member's profile link that is on screen: `user-team-card/user-info.tsx:40` / `user-team-block/user-info.tsx:34`. */
const memberOnScreen = (page: Page, memberUserId: string): Locator =>
	page.locator(`a[href^="/profile/${memberUserId}"]`).locator('visible=true');

/** The circle `MemberAvatar` renders into — the first block inside that link. */
const memberCircle = (page: Page, memberUserId: string): Locator =>
	memberOnScreen(page, memberUserId).locator('xpath=./div[1]');

/** The avatar image, by the alt text `member-avatar.tsx:25` gives it. */
const memberImage = (page: Page, memberUserId: string): Locator =>
	memberOnScreen(page, memberUserId).getByRole('img', { name: 'Team Avatar' });

/** The text the avatar circle actually shows: one entry per on-screen copy of that member. */
const renderedInitials = async (page: Page, memberUserId: string): Promise<string[]> =>
	(await memberCircle(page, memberUserId).allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());

// ------------------------------------------------------------------ the image pipeline

const IMAGE_HOST = 'https://cdn.ever.co';
const MISSING_IMAGE = `${IMAGE_HOST}/e2e/member-avatar-missing.png`;
const LIVE_IMAGE = `${IMAGE_HOST}/e2e/member-avatar-live.png`;
const NEVER_ASKED_IMAGE = `${IMAGE_HOST}/e2e/member-avatar-never-asked.png`;

/** A real 1×1 PNG (signature, IHDR 1×1/8-bit RGBA and all three CRCs verified before writing it down). */
const TINY_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64'
);

type OptimizerCall = { address: string; status: number };

/** The member's own address behind one `/_next/image` call. */
const optimizedAddress = (url: URL): string => url.searchParams.get('url') ?? '';

/** Every image the browser asked the Next.js optimiser for, with the answer it got. */
function recordOptimizerCalls(page: Page): OptimizerCall[] {
	const calls: OptimizerCall[] = [];
	page.on('response', (response) => {
		const url = new URL(response.url());
		if (url.pathname !== '/_next/image') return;
		calls.push({ address: optimizedAddress(url), status: response.status() });
	});
	return calls;
}

/**
 * Answers the optimiser call for one address with a PNG, or plainly with a 404. Nothing leaves the machine.
 *
 * measured, not intended: the 404 arm answers with text on purpose — a 404 that answers a valid PNG body left the
 * image element in the DOM (probe 5, `404-png-body`), while a plainly answered 404 and an aborted request both make
 * `next/image` report the failure and `Avatar` draw its fallback.
 */
async function stubOptimizer(page: Page, address: string, answer: 'png' | 'missing'): Promise<void> {
	await page.route(
		(url) => url.pathname === '/_next/image' && optimizedAddress(url) === address,
		(route) =>
			answer === 'png'
				? route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG })
				: route.fulfill({ status: 404, contentType: 'text/plain', body: 'no such image' })
	);
}

const callsFor = (calls: OptimizerCall[], address: string): OptimizerCall[] =>
	calls.filter((call) => call.address === address);

const NAMES: Array<{ first: string; last: string; initial: string; note: string }> = [
	{ first: '李', last: '雷', initial: '李', note: 'the first letter in the name’s own script' },
	{ first: 'élodie', last: 'dupont', initial: 'É', note: 'an accented Latin name, upper-cased' },
	{ first: '  bob', last: '', initial: 'B', note: 'leading spaces are not the first letter' },
	{ first: '123', last: '', initial: '', note: 'no letter at all, so an empty circle' }
];

test.describe("lane-c · a member's avatar on the team page", () => {
	test('control: the fixture teammate has no image address today, so the card shows their initial', async ({
		app,
		fixture
	}) => {
		const teammate = fixture.ids.teammateUser;
		const view = await app('/');

		await expect(memberOnScreen(view, teammate), 'the teammate holds exactly one avatar on screen').toHaveCount(1);
		await expect
			.poll(() => renderedInitials(view, teammate), {
				message: `the teammate card never rendered its initial (${await renderedInitials(view, teammate)})`
			})
			.toEqual(['F']);
		await expect(memberImage(view, teammate), 'no image for a member the mock gives no address for').toHaveCount(0);
	});

	test('a member with no image address shows the initial of the full name, and no image', async ({
		app,
		page,
		fixture
	}) => {
		const teammate = fixture.ids.teammateUser;
		await serveMember(page, teammate, { firstName: 'Imageless', lastName: 'Person', imageUrl: null });
		const view = await app('/');

		await expect(memberOnScreen(view, teammate), 'the card shows the name the answer carries').toContainText(
			'Imageless Person'
		);
		await expect.poll(() => renderedInitials(view, teammate)).toEqual(['I']);
		await expect(memberImage(view, teammate)).toHaveCount(0);
	});

	test('an address that is not an address is never asked for: initial, no image, no request', async ({
		app,
		page,
		fixture
	}) => {
		const teammate = fixture.ids.teammateUser;
		const calls = recordOptimizerCalls(page);
		// A valid host inside an invalid value: `isValidUrl` (is-valid-url.ts:1-7) fails the whole string, so nothing of it is fetched.
		await serveMember(page, teammate, {
			firstName: 'Rogue',
			lastName: 'Address',
			imageUrl: `not an address ${NEVER_ASKED_IMAGE}`
		});
		const view = await app('/');

		await expect.poll(() => renderedInitials(view, teammate)).toEqual(['R']);
		await expect(memberImage(view, teammate)).toHaveCount(0);
		await page.waitForTimeout(1_500);
		expect(
			callsFor(calls, NEVER_ASKED_IMAGE),
			`the page asked the image optimiser for an invalid address (${JSON.stringify(calls)})`
		).toHaveLength(0);
	});

	test('an address whose request fails answers 404, and the avatar falls back to the initial', async ({
		app,
		page,
		fixture
	}) => {
		const teammate = fixture.ids.teammateUser;
		const calls = recordOptimizerCalls(page);
		await stubOptimizer(page, MISSING_IMAGE, 'missing');
		await serveMember(page, teammate, { firstName: 'Dead', lastName: 'Link', imageUrl: MISSING_IMAGE });
		const view = await app('/');

		// The initial is only there once the failure has arrived: this polls, so it waits for the swap and not for a guess.
		await expect
			.poll(() => renderedInitials(view, teammate), {
				message: `the avatar never fell back to the initial (${await renderedInitials(view, teammate)})`
			})
			.toEqual(['D']);
		await expect(memberImage(view, teammate), 'the failed image is not drawn').toHaveCount(0);
		expect(
			callsFor(calls, MISSING_IMAGE).map((call) => call.status),
			`the member's address was fetched through the optimiser and answered 404 (${JSON.stringify(calls)})`
		).toEqual([404]);
	});

	test('an address that answers a PNG is shown instead of the initial', async ({ app, page, fixture }) => {
		const teammate = fixture.ids.teammateUser;
		const calls = recordOptimizerCalls(page);
		await stubOptimizer(page, LIVE_IMAGE, 'png');
		await serveMember(page, teammate, { firstName: 'Live', lastName: 'Image', imageUrl: LIVE_IMAGE });
		const view = await app('/');

		const image = memberImage(view, teammate);
		await expect(image, 'the member shows the image the stub answered').toHaveCount(1);
		await expect(image, 'and it is the image on screen').toBeVisible();
		await expect.poll(() => renderedInitials(view, teammate)).toEqual(['']);
		expect(
			callsFor(calls, LIVE_IMAGE).map((call) => call.status),
			`the member's address was fetched through the optimiser and answered 200 (${JSON.stringify(calls)})`
		).toEqual([200]);
	});

	for (const name of NAMES) {
		const fullname = `${name.first} ${name.last}`;
		test(`the initial rendered for ${JSON.stringify(fullname)} is ${JSON.stringify(name.initial)} — ${name.note}`, async ({
			app,
			page,
			fixture
		}) => {
			const teammate = fixture.ids.teammateUser;
			await serveMember(page, teammate, { firstName: name.first, lastName: name.last });
			const view = await app('/');

			// 30 s, not the default: an empty array here means the member list had not rendered yet, not a wrong initial.
			// Measured by the lead on 2026-11-23: with four Chrome sessions and three compiling lanes on one PC, the first
			// of these cases saw no circle at all for 15 s (`E:\Coding\.tmp\s2-lead-lane-c-avatar-1.log`), and the same
			// case passed on the next run.
			await expect
				.poll(() => renderedInitials(view, teammate), {
					message: `the avatar circle for ${JSON.stringify(fullname)} rendered something else (${await renderedInitials(view, teammate)})`,
					timeout: 30_000
				})
				.toEqual([name.initial]);
			// measured, not intended: an empty initial renders a circle with nothing in it — `initialOf` returns ''
			// (member-avatar.tsx:5-11) and the div is still there.
			await expect(memberCircle(view, teammate), 'the circle itself is still rendered').toHaveCount(1);
			await expect(memberImage(view, teammate), 'no image without an address').toHaveCount(0);
		});
	}

	test('the BLOCKS view falls back the same way, through its own user-info', async ({ app, page, fixture }) => {
		const teammate = fixture.ids.teammateUser;
		await stubOptimizer(page, MISSING_IMAGE, 'missing');
		await serveMember(page, teammate, { firstName: 'Block', lastName: 'Fallback', imageUrl: MISSING_IMAGE });
		const view = await app('/');

		await view.getByRole('tab', { name: 'Blocks' }).click();
		await expect
			.poll(() => renderedInitials(view, teammate), {
				message: `the block view never rendered the fallback initial (${await renderedInitials(view, teammate)})`
			})
			.toEqual(['B']);
		await expect(memberImage(view, teammate), 'the block view does not draw the failed image either').toHaveCount(
			0
		);
	});

	test('the TABLE view renders the same avatar: the row shows the initial of the name in the answer', async ({
		app,
		page,
		fixture
	}) => {
		const teammate = fixture.ids.teammateUser;
		// The table reads the same members the cards do; the name is its own so a patch that never landed cannot pass.
		await serveMember(page, teammate, { firstName: 'Table', lastName: 'Row' });
		const view = await app('/');

		await view.getByRole('tab', { name: 'Table' }).click();
		await expect
			.poll(() => renderedInitials(view, teammate), {
				message: `the table row never rendered the initial of the name it was given (${await renderedInitials(view, teammate)})`
			})
			.toEqual(['T']);
		await expect(memberImage(view, teammate), 'no image in the table row without an address').toHaveCount(0);
	});
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page, Route } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What **Settings › Team › Members** shows and sends on its **invitations side only** — the Pending invitations
 * section, the Requests to join section and the invite dialog — on lane-a (app `http://localhost:3031`, mock
 * `http://127.0.0.1:3992`, control `3994`; `playwright/test-servers.ts:38`). The members list on the same page belongs
 * to `suites/lane-c/team-members-settings-ui.spec.ts`; this file never reads or clicks a `#members` row, and every
 * text read is scoped to `#invitations`, `#requests` or the dialog.
 *
 * Components it drives: `app/[locale]/(main)/settings/team/members/page.tsx` → `MembersSettingsPage`
 * (`core/components/settings/pages/members/members-settings-page.tsx`) behind `TeamSettingsGate`
 * (`core/components/settings/kit/team-settings-gate.tsx:37-56`) → `PendingInvitationsSection`
 * (`core/components/settings/pages/members/pending-invitations-section.tsx`), its `RevokeInvitationDialog`
 * (`:113-172`, `ConfirmDestructiveDialog` in `core/components/settings/kit/danger.tsx:104-180`),
 * `JoinRequestsSection` (`core/components/settings/pages/members/join-requests-section.tsx`) and `InviteFormModal`
 * (`core/components/features/teams/invite-form-modal.tsx`, state `core/hooks/invitations/use-invite-dialog.ts`).
 *
 * ## Where the numbers came from
 *
 * Every pinned value was read off a lane-a run of this file or of the throwaway probes
 * `D:\Coding\.tmp\probe-teaminvitations\probe1.spec.ts`, `probe2.spec.ts`, `probe3.spec.ts` (logs
 * `D:\Coding\.tmp\s3-lane-a-teaminvitations-p1.log`, `-p2.log`, `-p3.log`, 2026-11-27/28; their own `[P MEASURE]`,
 * `[Q MEASURE]` and `[R MEASURE]` lines are the sources, and this file prints `[lane-a teaminvitations] MEASURE`
 * lines for the same values). The probes corrected the quick code map in three places, each re-read in the code and
 * re-measured: the invitation send goes to **`POST /api/invite/emails`** (not `/api/invite`; `invite.service.ts:32`);
 * the resend body on this lane is **`{tenantId, inviteId, inviteType:'TEAM', organizationId, callbackUrl}`**
 * (`invite.service.ts:201-249`, measured in `-p2.log`), not `{invitationId}`; and the accept/reject paths carry the
 * **uppercase enum values** `…/ACCEPTED` and `…/REJECTED` (`core/types/generics/enums/index.ts:1-4`, measured in
 * `-p3.log`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's NextAuth stub and app shell, and the mock's own answers for the team and its members, the
 * user, the role and `GET /api/roles/options?name=EMPLOYEE` (`cypress/support/mock-gauzy-server.mjs:672-674`). The
 * fixture person is `isEmailVerified: true` (`mock-gauzy-server.mjs:105-107`), so the page's `Invite` button is
 * enabled in every case here; the verification gate itself is `suites/lane-b/verification-gated-actions.spec.ts`.
 *
 * **Served by this file** (`page.route` behind a **mock-origin URL predicate** — never a bare glob over `api`, which on
 * this lane would also catch the app's own `app/api/**` routes — restating the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`) and answering `OPTIONS` with 204 before recording anything; the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts`): the invitation list, `POST /api/invite/emails`,
 * `POST /api/invite/resend`, `DELETE /api/invite/:id`, the join-request list,
 * `PUT /api/organization-team-join/:id/<ACTION>`, and in test 16 only the `GET /api/roles` list an admin picks the
 * batch role from. The mock cannot serve these: `GET /api/invite` answers one static undated invitation
 * (`:661-671`), `GET /api/organization-team-join` answers empty (`:891`), `POST /api/invite/emails` records without
 * changing the next read (`:584-587`), and resend, revoke and the join answers fall to the catch-alls (`:893-895`),
 * so no re-read would ever differ. Every stub is **store-backed**: a write changes what the next read answers, a
 * refused write changes nothing, and `route.fetch()` is never called. `/api/invite/me` is deliberately **not**
 * intercepted — the shell reads it for the invitee side (it shows up in `-p1.log`).
 *
 * Dates are served relative to the run's own clock, each at local midday moved with `setDate` (never `± 24 h`, which
 * a DST or a short day would move to another calendar day), and asserted as `Intl` renderings of the served value,
 * never typed: `modals.invite.SENT_ON` carries `{date, date, ::MMMd}`, which prints exactly what
 * `Intl.DateTimeFormat('en', {month:'short', day:'numeric'})` prints, and the request rows'
 * `format.dateTime(…, {dateStyle:'medium'})` exactly what `Intl.DateTimeFormat('en', {dateStyle:'medium'})` prints
 * (both pinned in `-p1.log`). One invitation is already expired by its date, one expires in the future, one has no
 * expiry at all. Served ids come from `fixture.ids.invite` / `fixture.ids.member` / `fixture.ids.role` /
 * `fixture.ids.teamA` with only their last group replaced, so no id is typed either. The one value this file reads
 * off the lane instead of serving is a **member's e-mail** (test 18): it is taken from the
 * `GET /api/organization-team/:id` answer the page itself received (`mock-gauzy-server.mjs:199-253` put `email` on
 * `members[].employee.user`), because the mock's member addresses are not in the bootstrap fixture.
 *
 * ## Console excuses
 *
 * Tests that arm a refusal name the exact line that refusal leaves in the dev console — never a bare prefix: the
 * adapter's `HTTP Error: <VERB> <path without /api><query> <status>` or, for a 403, its different critical sentence
 * (`core/services/logs/logger-adapter.service.ts:187-196`), the dev mutation print `Mutation failed: ApiError:
 * stub refused <VERB> <path>` (`core/components/common/mutation-error-toaster.tsx:47-49`), and the service's own
 * line for a failed invitations read or a failed resend. Anything else in the console fails the test. The only
 * un-armed noise excused is React's dev-mode store warning, `SHELL_STORE_NOISE` below.
 *
 * ## Findings (measured; none of them is a `[MEASURED, NOT INTENDED]` case)
 *
 * - An **empty** invitations or requests section shows no count at all, because `SectionCount` returns null below 1
 *   (`core/components/settings/pages/members/people-parts.tsx:69-72`). Deliberate.
 * - The chip and the date line follow `invitationStateOf`, where **the status wins over the dates**: an answer with
 *   `status:'EXPIRED'` prints `Expired …` even when its `expireDate` is still in the future
 *   (`core/lib/utils/invitation-state.ts:26-39`, `pending-invitations-section.tsx:32-38`), and a `status:'REJECTED'`
 *   answer keeps its own chip while its still-future expiry still reads `Expires …`. Written on purpose.
 * - A refused **resend** reaches the user only as the global fallback toast (`toasts.MUTATION_FAILED` + the reason):
 *   the mutation has no `onError` and no `handlesOwnError` (`core/hooks/invitations/use-send-team-invitation.ts:64-71`)
 *   and `core/hooks/settings/use-team-invitations-settings.ts:90-92` swallows the rejection under the comment
 *   `// The mutation reports the failure`, which is what was measured, so it is not a tag. The row stays.
 * - A refused **revoke** is reported twice — the hook's own toast (`core/hooks/invitations/use-remove-team-invitation.ts:41-44`)
 *   and the reason inline in the confirmation, which stays open with what was about to be revoked
 *   (`pending-invitations-section.tsx:147-152`, `danger.tsx:161-164`). Measured in `-p3.log`; both are written on
 *   purpose.
 * - A refused **send** shows the failure next to the addresses and no toast at all: `meta: { handlesOwnError: true }`
 *   (`core/hooks/invitations/use-send-team-invitation.ts:31-34`) keeps `mutation-error-toaster.tsx:50-52` silent.
 * - A refused **answer to a request** shows its own toast (`core/hooks/organizations/teams/use-accept-reject-request-to-join.ts:42-49`)
 *   and the request stays open, because nothing invalidates the list on failure (`:34-41` invalidates on success
 *   only). Measured in `-p3.log`.
 * - The dialog's role pick defaults to the **Member** role for an organization admin
 *   (`core/hooks/invitations/use-invite-dialog.ts:52-56`), and the picked role id is what `POST /api/invite/emails`
 *   carries; a team manager who is not an admin gets no pick at all
 *   (`core/components/features/teams/invite-form-modal.tsx:177`) and the service's own
 *   `GET /roles/options?name=EMPLOYEE` fallback carries the role instead
 *   (`core/services/client/api/organizations/teams/invites/invite.service.ts:44-48,56`).
 * - For a non-admin the roles read is `GET /roles/team-assignable` (`core/hooks/roles/use-roles-query.ts:28-60`),
 *   which this lane's mock has no handler for, so it answers the catch-all `pagination([])`
 *   (`cypress/support/mock-gauzy-server.mjs:895`): a **gap in the lane's mock**, not a defect. The send still carried
 *   a role id through the fallback above (`-p2.log`, `-p3.log`).
 * - Dev mode mounts the page twice, so a read is recorded more than once per visit, and a failed read shows its
 *   error `Notice` only after React Query's retries are spent (`-p2.log` still found a skeleton 1 s after the visit,
 *   the notice within 30 s). No test asserts an exact count of a read; the error tests wait for the notice, and Retry
 *   is proven by the read count **growing**, not by an absolute number.
 * - A plain member of the team is turned away by the gate before any section mounts, so **no** invitation or request
 *   read ever happens (`team-settings-gate.tsx:44,52-54`; the stub recorded nothing).
 *
 * ## What this file does not cover
 *
 * The members list and its writes (lane-c's file), the e-mail-verification gate on the Invite button
 * (`suites/lane-b/verification-gated-actions.spec.ts`), the invitee's own side (`/auth/accept-invite`), the dialog's
 * pending list (its Resend/Revoke buttons call the same hooks through
 * `core/components/features/teams/invite/invite-pending-list.tsx:147-162`; only the section's row buttons are driven
 * here), the placeholder Add/Claim/Merge controls (never offered on this lane: no mock employee carries
 * `isPlaceholder`, `core/lib/utils/member-placeholder.ts:34-36`), and an organization admin who is not a member of
 * the active team — the lane's mock always makes the fixture person a member of the active team
 * (`mock-gauzy-server.mjs:218`), so that combination is not reachable here.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const PAGE_PATH = '/settings/team/members';

/** `locales/en.json`: every English sentence below is looked up by key, never typed. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as unknown;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const message = (key: string): string => {
	const found = key.split('.').reduce<unknown>((node, part) => (isRecord(node) ? node[part] : undefined), EN);
	if (typeof found !== 'string') {
		throw new Error(`locales/en.json holds no English string at ${key}`);
	}

	return found;
};

const PLURAL_BODY = /\{count, plural,(?:[^{}]|\{[^{}]*\})*\}/g;
const PLURAL_BRANCH = /(?:(\d+)|one|other)\s*\{([^{}]*)\}/g;

/** The `{count, plural, …}` bodies used here hold no nested braces inside a branch, so this flat scan renders them. */
const renderPlural = (body: string, count: number): string => {
	let chosen = '';
	let fallback = '';
	for (const found of body.matchAll(PLURAL_BRANCH)) {
		const [, exact, text] = found;
		if (exact !== undefined) {
			if (Number(exact) === count) chosen = text;
			continue;
		}
		if (!fallback) fallback = text;
		if (found[0].startsWith('one') && count === 1) chosen = text;
		if (found[0].startsWith('other') && count !== 1) chosen = text;
	}

	return (chosen || fallback).replaceAll('#', String(count));
};

/** One English sentence with its `{count, plural, …}` resolved and its `{email}` / `{name}` / `{team}` filled. */
const phrase = (key: string, values: Record<string, string | number> = {}): string => {
	const count = typeof values.count === 'number' ? values.count : 0;
	let text = message(key).replace(PLURAL_BODY, (body) => renderPlural(body, count));
	for (const [name, value] of Object.entries(values)) {
		if (name === 'count') continue;
		text = text.replaceAll(`{${name}}`, String(value));
	}

	return text;
};

/** `modals.invite.*_ON` print `{date, date, ::MMMd}`; `::MMMd` is exactly this `Intl` shape. */
const shortDate = (iso: string) =>
	new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso));
/** `join-requests-section.tsx:99` formats a request date with `dateStyle:'medium'`. */
const mediumDate = (iso: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));
const dated = (key: string, iso: string) => message(key).replace(/\{date,[^}]*\}/g, shortDate(iso));

const report = (label: string, value: unknown) =>
	console.log(`[lane-a teaminvitations] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated on every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const INVITE_ROUTE = '/api/invite';
const EMAILS_ROUTE = '/api/invite/emails';
const RESEND_ROUTE = '/api/invite/resend';
const JOIN_ROUTE = '/api/organization-team-join';
const ROLES_ROUTE = '/api/roles';

type FixtureIds = Record<string, string>;
type ServedCall = { method: string; path: string; search: string; body: string | null; status: number };
type ServedInvitation = {
	id: string;
	email: string;
	fullName: string | null;
	status: string;
	createdAt: string | null;
	expireDate: string | null;
};
type ServedJoinRequest = {
	id: string;
	email: string;
	fullName: string;
	linkAddress: string;
	position: string;
	organizationTeamId: string;
	status: string;
	createdAt: string;
	updatedAt: string;
};
type ServedRole = { id: string; name: string; isSystem: boolean; tenantId: string };

type Script = {
	invitations?: ServedInvitation[];
	requests?: ServedJoinRequest[];
	/** Served in test 16 only: the roles an admin picks the batch role from. */
	roles?: ServedRole[];
	/** Standing refusals: every read of that route stays refused for the rest of the test. */
	refuseInviteRead?: number;
	refuseJoinRead?: number;
	/** Per-call refusals, answered in the order the page sends. */
	sendRefusals?: number[];
	resendRefusal?: number;
	removeRefusal?: number;
	answerRefusal?: number;
	/** Hold the resend answer open, so the row's busy state can be watched. */
	holdResend?: boolean;
};

type InvitationsHarness = {
	calls: ServedCall[];
	invitations: () => ServedInvitation[];
	requests: () => ServedJoinRequest[];
	readsOf: (pathname: string) => number;
	writesOf: (pathname: string) => ServedCall[];
	refused: () => ServedCall[];
	releaseHeldResend: () => void;
};

/** Served ids are the fixture ids with only their last group replaced, so no id is typed here. */
const servedId = (ids: FixtureIds, key: string, tail: number): string => {
	const base = ids[key];
	if (!base) {
		throw new Error(`the bootstrap fixture carries no id "${key}"`);
	}

	return `${base.slice(0, base.length - 12)}${String(tail).padStart(12, '0')}`;
};

/** A served day at local midday, moved with `setDate` so a calendar day stays a calendar day. */
function dayIso(offsetDays: number): string {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);

	return day.toISOString();
}

/** This file's stand-in for the invitation and join-request API, on the mock origin only. */
async function serveInvitations(page: Page, ids: FixtureIds, script: Script): Promise<InvitationsHarness> {
	const store = { invitations: [...(script.invitations ?? [])], requests: [...(script.requests ?? [])] };
	const sendRefusals = [...(script.sendRefusals ?? [])];
	const calls: ServedCall[] = [];
	let releaseHeldResend: (() => void) | undefined;

	await page.route(
		(url: URL) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === INVITE_ROUTE ||
				url.pathname === EMAILS_ROUTE ||
				url.pathname === RESEND_ROUTE ||
				// the shell's own invitee read is left to the mock
				(url.pathname.startsWith(`${INVITE_ROUTE}/`) && url.pathname !== `${INVITE_ROUTE}/me`) ||
				url.pathname === JOIN_ROUTE ||
				url.pathname.startsWith(`${JOIN_ROUTE}/`) ||
				(script.roles !== undefined && url.pathname === ROLES_ROUTE)),
		async (route: Route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			if (method === 'OPTIONS') {
				return route.fulfill({ status: 204, headers: CORS_HEADERS });
			}

			const answer = (status: number, body?: unknown) => {
				calls.push({ method, path: url.pathname, search: url.search, body: request.postData(), status });

				return route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});
			};
			const refusalBody = (status: number) => ({
				statusCode: status,
				message: `stub refused ${method} ${url.pathname}`
			});

			if (script.roles !== undefined && url.pathname === ROLES_ROUTE && method === 'GET') {
				return answer(200, { items: script.roles, total: script.roles.length });
			}
			if (url.pathname === INVITE_ROUTE && method === 'GET') {
				if (script.refuseInviteRead) {
					return answer(script.refuseInviteRead, refusalBody(script.refuseInviteRead));
				}

				return answer(200, { items: store.invitations, total: store.invitations.length });
			}
			if (url.pathname === RESEND_ROUTE && method === 'POST') {
				const status = script.resendRefusal ?? 200;
				const body = script.resendRefusal ? refusalBody(status) : { generatedMaps: [], raw: [], affected: 1 };
				if (script.holdResend) {
					// recorded before the hold: the point of holding the answer is that the call is on its way
					calls.push({ method, path: url.pathname, search: url.search, body: request.postData(), status });
					await new Promise<void>((resolve) => {
						releaseHeldResend = resolve;
					});

					return route.fulfill({
						status,
						headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
						body: JSON.stringify(body)
					});
				}

				return answer(status, body);
			}
			if (url.pathname === EMAILS_ROUTE && method === 'POST') {
				const status = sendRefusals.shift();
				if (status !== undefined) {
					return answer(status, refusalBody(status));
				}
				const body = JSON.parse(String(request.postData())) as { emailIds?: string[] };
				const created = (body.emailIds ?? []).map((email, index) => ({
					id: servedId(ids, 'invite', 200 + index),
					email,
					fullName: null,
					status: 'INVITED',
					createdAt: dayIso(0),
					expireDate: null
				}));
				store.invitations = [...store.invitations, ...created];

				return answer(201, { items: created, total: created.length });
			}
			if (url.pathname.startsWith(`${INVITE_ROUTE}/`) && method === 'DELETE') {
				if (script.removeRefusal) {
					return answer(script.removeRefusal, refusalBody(script.removeRefusal));
				}
				const invitationId = url.pathname.slice(INVITE_ROUTE.length + 1);
				store.invitations = store.invitations.filter((item) => item.id !== invitationId);

				return answer(204);
			}
			if (url.pathname === JOIN_ROUTE && method === 'GET') {
				if (script.refuseJoinRead) {
					return answer(script.refuseJoinRead, refusalBody(script.refuseJoinRead));
				}

				return answer(200, { items: store.requests, total: store.requests.length });
			}
			if (url.pathname.startsWith(`${JOIN_ROUTE}/`) && method === 'PUT') {
				if (script.answerRefusal) {
					return answer(script.answerRefusal, refusalBody(script.answerRefusal));
				}
				const [requestId, action] = url.pathname.slice(JOIN_ROUTE.length + 1).split('/');
				store.requests = store.requests.map((item) =>
					item.id === requestId ? { ...item, status: action } : item
				);

				return answer(200, { items: store.requests, total: store.requests.length });
			}

			return answer(599, { message: `this file scripted no answer for ${method} ${url.pathname}` });
		}
	);

	return {
		calls,
		invitations: () => store.invitations,
		requests: () => store.requests,
		readsOf: (pathname) => calls.filter((call) => call.method === 'GET' && call.path === pathname).length,
		writesOf: (pathname) => calls.filter((call) => call.method !== 'GET' && call.path === pathname),
		refused: () => calls.filter((call) => call.status >= 400),
		releaseHeldResend: () => releaseHeldResend?.()
	};
}

const servedInvitation = (
	ids: FixtureIds,
	tail: number,
	email: string,
	extra: Partial<ServedInvitation> = {}
): ServedInvitation => ({
	id: servedId(ids, 'invite', tail),
	email,
	fullName: null,
	status: 'INVITED',
	createdAt: dayIso(-2),
	expireDate: dayIso(4),
	...extra
});

const servedRequest = (
	ids: FixtureIds,
	tail: number,
	email: string,
	extra: Partial<ServedJoinRequest> = {}
): ServedJoinRequest => ({
	id: servedId(ids, 'member', tail),
	email,
	fullName: email,
	linkAddress: 'https://link.example.test',
	position: 'Developer',
	organizationTeamId: ids.teamA,
	status: 'REQUESTED',
	createdAt: dayIso(-1),
	updatedAt: dayIso(-1),
	...extra
});

/** React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';

/** The line a refusal this file armed leaves in the console: the verb, the service path (no `/api`) and the status.
 *  A 403 goes down the adapter's critical branch instead (`core/services/logs/logger-adapter.service.ts:187-196`). */
const armedHttpLine = (call: ServedCall) => {
	const servicePath = `${call.path.replace(/^\/api/, '')}${call.search}`;

	return call.status === 403
		? `[HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - ${call.method} ${servicePath} - Permission Denied`
		: `[HttpClient] HTTP Error: ${call.method} ${servicePath} ${call.status}`;
};
/** `core/components/common/mutation-error-toaster.tsx:47-49` prints the failure with the stub's own message. */
const armedMutationLine = (call: ServedCall) => `Mutation failed: ApiError: stub refused ${call.method} ${call.path}`;
/** `invite.service.ts:220-227`, logging a failed resend with the id and the same stub message. */
const armedResendServiceLine = (invitationId: string) =>
	`[InviteService] Failed to resend team invitation {inviteId: ${invitationId}, error: stub refused POST ${RESEND_ROUTE}}`;
/** `invite.service.ts:150-153`, logging a failed invitations read with the same stub message. */
const armedInviteReadServiceLine = `[InviteService] Error fetching team invitations: ApiError: stub refused GET ${INVITE_ROUTE}`;

const consoleFindings = (shield: Shield, armed: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !armed.some((fragment) => line.includes(fragment)));

/** Every refusal a test armed, named line by line: nothing else may show up in the console. */
const armedExcuses = (harness: InvitationsHarness) =>
	harness.refused().flatMap((call) => [armedHttpLine(call), armedMutationLine(call)]);

const section = (page: Page, id: string) => page.locator(`#${id}`);
const invitationRows = (page: Page) => section(page, 'invitations').locator('li');
const requestRows = (page: Page) => section(page, 'requests').locator('li');
const rowNamed = (rows: Locator, name: string) => rows.filter({ hasText: name });
const sectionCount = (page: Page, id: string) => section(page, id).locator('kbd');
const dialogOf = (page: Page) => page.getByRole('dialog');
const inviteButtons = (page: Page) => page.getByRole('button', { name: phrase('common.INVITE'), exact: true });
/** The app's own toasts: the dev-only `DEV Query/Mutation failed …` toast carries a "Copy details" button. */
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' });
const resendButton = (page: Page, email: string) =>
	section(page, 'invitations').getByRole('button', {
		name: phrase('modals.invite.RESEND', { email }),
		exact: true
	});
const revokeButton = (page: Page, email: string) =>
	section(page, 'invitations').getByRole('button', {
		name: phrase('modals.invite.REVOKE', { email }),
		exact: true
	});
const chipsList = (page: Page) => dialogOf(page).getByRole('list', { name: phrase('modals.invite.chips.LIST_LABEL') });
const emailsField = (page: Page) => dialogOf(page).getByLabel(phrase('modals.invite.EMAILS_LABEL'));
const dialogSendButton = (page: Page) =>
	dialogOf(page).getByRole('button', { name: phrase('common.INVITE'), exact: true });

/** Open the invite dialog and wait until it stops gathering (`aria-busy`, `invite-form-modal.tsx:211`):
 *  `use-invite-dialog.ts:108-116` returns a send that does nothing while the invitations or the roles are still
 *  arriving, which would otherwise read as a click the page ignored. */
const openInviteDialog = async (page: Page) => {
	await inviteButtons(page).first().click();
	await expect(dialogOf(page), 'the invite dialog never opened').toBeVisible();
	const send = dialogSendButton(page).first();
	await expect(send, 'the dialog kept gathering the team invitations and the roles').toHaveAttribute(
		'aria-busy',
		'false',
		{ timeout: 30_000 }
	);

	return send;
};

/** Each address becomes a chip on Enter (`invite-email-field.tsx:38,118-122`). */
const typeAddresses = async (page: Page, addresses: string[]) => {
	const field = emailsField(page);
	await field.click();
	for (const address of addresses) {
		await field.fill(address);
		await field.press('Enter');
	}
};

/** The member e-mails the lane answered the page with, so none of them is typed here. */
const memberEmailsAnswered = async (page: Page, teamId: string): Promise<string[]> => {
	const answered = await page
		.waitForResponse(
			(response) =>
				response.url().startsWith(`${MOCK_API_ORIGIN}/api/organization-team/`) &&
				response.url().includes(teamId),
			{ timeout: 40_000 }
		)
		.then((response) => response.json() as { members?: Array<{ employee?: { user?: { email?: string } } }> });

	return (answered.members ?? [])
		.map((member) => member.employee?.user?.email ?? '')
		.filter((email) => email.length > 0);
};

test.describe('lane-a · Settings › Team › Members: invitations, requests to join, and the invite dialog', () => {
	// ------------------------------- 1-2. the invitations section as the answers print it

	test('1 · three invitations as printed, and the read that filled them', async ({ page, app, fixture, shield }) => {
		const sentPending = dayIso(-5);
		const expiresSoon = dayIso(3);
		const sentLongAgo = dayIso(-40);
		const expiredThen = dayIso(-10);
		const sentYesterday = dayIso(-1);
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [
				servedInvitation(fixture.ids, 1, 'pending.person@example.test', {
					fullName: 'Pending Person',
					createdAt: sentPending,
					expireDate: expiresSoon
				}),
				servedInvitation(fixture.ids, 2, 'expired.person@example.test', {
					fullName: 'Expired Person',
					createdAt: sentLongAgo,
					expireDate: expiredThen
				}),
				servedInvitation(fixture.ids, 3, 'no.expiry@example.test', {
					createdAt: sentYesterday,
					expireDate: null
				})
			],
			requests: []
		});
		await app(PAGE_PATH);

		await expect(invitationRows(page), 'three rows').toHaveCount(3);
		// name, then "email · Invited <day> · Expires <day>" (`pending-invitations-section.tsx:25-50`)
		await expect(rowNamed(invitationRows(page), 'Pending Person')).toContainText(
			`pending.person@example.test · ${dated('modals.invite.SENT_ON', sentPending)} · ${dated(
				'modals.invite.EXPIRES_ON',
				expiresSoon
			)}`
		);
		// an expiry already in the past reads "Expired <day>" (`:32-35`)
		await expect(rowNamed(invitationRows(page), 'Expired Person')).toContainText(
			`expired.person@example.test · ${dated('modals.invite.SENT_ON', sentLongAgo)} · ${dated(
				'modals.invite.EXPIRED_ON',
				expiredThen
			)}`
		);
		await expect(invitationRows(page)).toHaveText([
			/Pending Person[\s\S]*Pending/,
			/Expired Person[\s\S]*Expired/,
			/no\.expiry@example\.test[\s\S]*Pending/
		]);

		const noNameRow = rowNamed(invitationRows(page), 'no.expiry@example.test');
		// with no fullName the address is the name and is not repeated in the detail line (`:44-49`)
		await expect(noNameRow.getByText(dated('modals.invite.SENT_ON', sentYesterday), { exact: true })).toBeVisible();
		await expect(noNameRow.getByText('no.expiry@example.test', { exact: true })).toHaveCount(1);

		const count = sectionCount(page, 'invitations');
		await expect(count).toHaveText('3');
		await expect(count).toHaveAttribute('aria-label', phrase('settings.members.INVITATIONS_COUNT', { count: 3 }));

		// the read and its query (`invite.service.ts:94-137`)
		await expect.poll(() => harness.readsOf(INVITE_ROUTE), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		const inviteRead = harness.calls.find((call) => call.method === 'GET' && call.path === INVITE_ROUTE);
		const inviteQuery = new URLSearchParams(inviteRead?.search ?? '');
		report('invite read query', Object.fromEntries(inviteQuery.entries()));
		expect(inviteQuery.get('where[tenantId]'), 'the tenant the read asked for').toBe(fixture.ids.tenantA);
		expect(inviteQuery.get('where[organizationId]'), 'the organization the read asked for').toBe(
			fixture.ids.organizationA
		);
		expect(inviteQuery.get('where[teams][id][0]'), 'the team the read asked for').toBe(fixture.ids.teamA);
		expect(inviteQuery.get('where[status]'), 'only unanswered invitations are asked for').toBe('INVITED');
		await expect.poll(() => harness.readsOf(JOIN_ROUTE), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);

		expect(consoleFindings(shield), 'nothing but the shell store warning was logged').toEqual([]);
	});

	test('2 · the states an answer carries, and an accepted invitation left out', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const declinedExpiry = dayIso(4);
		const expiredAnswerExpiry = dayIso(2);
		// `use-team-invitations-settings.ts:63-66` drops only ACCEPTED, so 4 answers → 3 rows. The ACCEPTED answer is
		// not something the read's own `where[status]=INVITED` would answer (`invite.service.ts:107`): what this pins
		// is the page's own filter, not a server shape.
		const served = [
			servedInvitation(fixture.ids, 4, 'status.expired@example.test', {
				fullName: 'Status Expired',
				status: 'EXPIRED',
				createdAt: dayIso(-20),
				expireDate: expiredAnswerExpiry
			}),
			servedInvitation(fixture.ids, 5, 'declined.person@example.test', {
				fullName: 'Declined Person',
				status: 'REJECTED',
				createdAt: dayIso(-9),
				expireDate: declinedExpiry
			}),
			servedInvitation(fixture.ids, 6, 'accepted.person@example.test', {
				fullName: 'Accepted Person',
				status: 'ACCEPTED',
				createdAt: dayIso(-7),
				expireDate: dayIso(7)
			}),
			servedInvitation(fixture.ids, 7, 'still.pending@example.test', {
				fullName: 'Still Pending',
				createdAt: dayIso(-3),
				expireDate: dayIso(6)
			})
		];
		const harness = await serveInvitations(page, fixture.ids, { invitations: served, requests: [] });
		await app(PAGE_PATH);

		await expect(invitationRows(page), 'the accepted answer is not listed').toHaveCount(3);
		await expect(sectionCount(page, 'invitations')).toHaveText('3');
		// the status wins over the dates: this answer's expiry is still in the future, yet it reads "Expired"
		await expect(rowNamed(invitationRows(page), 'Status Expired')).toContainText(
			phrase('modals.invite.EXPIRED_STATUS')
		);
		await expect(rowNamed(invitationRows(page), 'Status Expired')).toContainText(
			dated('modals.invite.EXPIRED_ON', expiredAnswerExpiry)
		);
		await expect(rowNamed(invitationRows(page), 'Declined Person')).toContainText(
			phrase('modals.invite.DECLINED_STATUS')
		);
		await expect(rowNamed(invitationRows(page), 'Declined Person')).toContainText(
			dated('modals.invite.EXPIRES_ON', declinedExpiry)
		);
		await expect(rowNamed(invitationRows(page), 'Still Pending')).toContainText(
			phrase('modals.invite.PENDING_STATUS')
		);
		await expect(page.getByText('Accepted Person', { exact: true })).toHaveCount(0);
		// the page was answered all four, the accepted one included, and left that one out itself
		await expect.poll(() => harness.readsOf(INVITE_ROUTE), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);

		expect(consoleFindings(shield), 'nothing but the shell store warning was logged').toEqual([]);
	});

	// ------------------------------- 3-4. nothing waiting, and a read that was refused

	test('3 · no invitation waiting: the empty message, its Invite button, and no count', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		await serveInvitations(page, fixture.ids, { invitations: [], requests: [] });
		await app(PAGE_PATH);

		await expect(
			section(page, 'invitations').getByText(phrase('settings.members.INVITATIONS_EMPTY'), { exact: true }),
			'the empty message'
		).toBeVisible({ timeout: 20_000 });
		await expect(invitationRows(page)).toHaveCount(0);
		// `SectionCount` renders nothing below 1 (`people-parts.tsx:69-72`)
		await expect(sectionCount(page, 'invitations')).toHaveCount(0);
		await expect(
			section(page, 'invitations').getByRole('button', { name: phrase('common.INVITE'), exact: true })
		).toHaveCount(1);

		expect(consoleFindings(shield), 'nothing but the shell store warning was logged').toEqual([]);
	});

	test('4 · a refused invitations read: its error, and Retry reading again', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [servedInvitation(fixture.ids, 1, 'pending.person@example.test')],
			requests: [],
			refuseInviteRead: 500
		});
		await app(PAGE_PATH);

		// the notice appears only once the read's retries are spent, so wait for it instead of reading once
		await expect(
			section(page, 'invitations').getByText(phrase('settings.members.INVITATIONS_ERROR'), { exact: true }),
			'the section says the read failed'
		).toBeVisible({ timeout: 40_000 });
		await expect(invitationRows(page), 'no row survives a failed read').toHaveCount(0);
		// a failed read shows no count either (`pending-invitations-section.tsx:197-206`)
		await expect(sectionCount(page, 'invitations')).toHaveCount(0);

		const readsBeforeRetry = harness.readsOf(INVITE_ROUTE);
		await section(page, 'invitations')
			.getByRole('button', { name: phrase('notifications.RETRY'), exact: true })
			.click();
		await expect.poll(() => harness.readsOf(INVITE_ROUTE), { timeout: 20_000 }).toBeGreaterThan(readsBeforeRetry);
		report('invite reads', { beforeRetry: readsBeforeRetry, afterRetry: harness.readsOf(INVITE_ROUTE) });
		await expect(
			section(page, 'invitations').getByText(phrase('settings.members.INVITATIONS_ERROR'), { exact: true }),
			'still refused, still says so'
		).toBeVisible({ timeout: 40_000 });

		const armed = harness.refused();
		expect(armed.length, 'this test armed the refusal it excuses').toBeGreaterThan(0);
		expect(
			consoleFindings(shield, [...armedExcuses(harness), armedInviteReadServiceLine]),
			'only the armed read refusal was logged'
		).toEqual([]);
	});

	// ------------------------------- 5-7. Resend

	test('5 · Resend: the request it sends, its toast, and the re-read after it', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const email = 'pending.person@example.test';
		const invitationId = servedId(fixture.ids, 'invite', 1);
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [servedInvitation(fixture.ids, 1, email, { fullName: 'Pending Person' })],
			requests: []
		});
		await app(PAGE_PATH);
		await expect(invitationRows(page)).toHaveCount(1);

		await resendButton(page, email).click();
		await expect.poll(() => harness.writesOf(RESEND_ROUTE).length, { timeout: 20_000 }).toBe(1);
		const body = JSON.parse(String(harness.writesOf(RESEND_ROUTE)[0]?.body)) as Record<string, unknown>;
		report('resend body', body);
		// the direct-mode body (`invite.service.ts:201-249`)
		expect(body, 'the body the resend sent').toEqual({
			tenantId: fixture.ids.tenantA,
			inviteId: invitationId,
			inviteType: 'TEAM',
			organizationId: fixture.ids.organizationA,
			callbackUrl: `${APP_ORIGIN}/auth/accept-invite`
		});

		await expect(appToasts(page).filter({ hasText: phrase('toasts.invites.SENT', { email }) })).toHaveCount(1);
		// the list is read again after the resend answered (`use-send-team-invitation.ts:68-70`): polled, because that
		// read is sent after the answer and may land after the toast
		const resendAt = harness.calls.findIndex((call) => call.path === RESEND_ROUTE);
		await expect
			.poll(
				() =>
					harness.calls
						.slice(resendAt + 1)
						.some((call) => call.method === 'GET' && call.path === INVITE_ROUTE),
				{
					timeout: 20_000
				}
			)
			.toBe(true);
		await expect(invitationRows(page), 'the row is still there after the re-read').toHaveCount(1);

		expect(consoleFindings(shield), 'a successful resend logged nothing').toEqual([]);
	});

	test('6 · while a Resend is on its way the row offers nothing else', async ({ page, app, fixture, shield }) => {
		const email = 'pending.person@example.test';
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [servedInvitation(fixture.ids, 1, email, { fullName: 'Pending Person' })],
			requests: [],
			holdResend: true
		});
		await app(PAGE_PATH);
		await expect(invitationRows(page)).toHaveCount(1);

		const row = invitationRows(page).first();
		await expect(row.getByRole('button')).toHaveCount(2);
		await expect(row.getByRole('button', { disabled: true })).toHaveCount(0);
		await resendButton(page, email).click();
		await expect
			.poll(() => harness.calls.some((call) => call.path === RESEND_ROUTE), { timeout: 20_000 })
			.toBe(true);
		// both row buttons are disabled while one invitation is busy (`pending-invitations-section.tsx:89,101`)
		await expect(row.getByRole('button', { disabled: true }), 'busy while the answer is held').toHaveCount(2);
		await expect(invitationRows(page), 'nothing changed in the list while it was on its way').toHaveCount(1);

		harness.releaseHeldResend();
		await expect(row.getByRole('button', { disabled: true }), 'the buttons are offered again').toHaveCount(0);
		await expect(appToasts(page).filter({ hasText: phrase('toasts.invites.SENT', { email }) })).toHaveCount(1);

		expect(consoleFindings(shield), 'a held then successful resend logged nothing').toEqual([]);
	});

	test("7 · a refused Resend reaches the user as the page's fallback toast", async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const email = 'pending.person@example.test';
		const invitationId = servedId(fixture.ids, 'invite', 1);
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [servedInvitation(fixture.ids, 1, email, { fullName: 'Pending Person' })],
			requests: [],
			resendRefusal: 403
		});
		await app(PAGE_PATH);
		await expect(invitationRows(page)).toHaveCount(1);

		await resendButton(page, email).click();
		const toast = appToasts(page).filter({ hasText: phrase('toasts.MUTATION_FAILED') });
		await expect(toast, 'the fallback for a mutation nobody else reports').toHaveCount(1);
		await expect(toast).toContainText(phrase('toasts.REASONS.PERMISSION'));
		await expect.poll(() => harness.writesOf(RESEND_ROUTE).length, { timeout: 20_000 }).toBe(1);
		await expect(invitationRows(page), 'the invitation is still pending').toHaveCount(1);

		expect(
			consoleFindings(shield, [...armedExcuses(harness), armedResendServiceLine(invitationId)]),
			'only the armed 403 was logged, in its 403 sentence'
		).toEqual([]);
	});

	// ------------------------------- 8-9. Revoke

	test('8 · Revoke: the confirmation, the DELETE, and the row gone', async ({ page, app, fixture, shield }) => {
		const kept = 'kept.person@example.test';
		const revoked = 'revoked.person@example.test';
		const revokedId = servedId(fixture.ids, 'invite', 2);
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [
				servedInvitation(fixture.ids, 1, kept, { fullName: 'Kept Person' }),
				servedInvitation(fixture.ids, 2, revoked, { fullName: 'Revoked Person' })
			],
			requests: []
		});
		await app(PAGE_PATH);
		await expect(invitationRows(page)).toHaveCount(2);

		await revokeButton(page, revoked).click();
		const confirm = dialogOf(page);
		await expect(confirm, 'the confirmation opened').toBeVisible();
		await expect(
			confirm.getByText(phrase('settings.members.REVOKE_TITLE', { email: revoked }), { exact: true })
		).toBeVisible();
		await expect(
			confirm.getByText(phrase('settings.members.REVOKE_CONSEQUENCE_LINK'), { exact: true })
		).toBeVisible();
		await expect(
			confirm.getByText(phrase('settings.members.REVOKE_CONSEQUENCE_AGAIN'), { exact: true })
		).toBeVisible();
		await expect(confirm.getByRole('button', { name: phrase('common.CANCEL'), exact: true })).toBeVisible();
		const revokeConfirm = confirm.getByRole('button', {
			name: phrase('modals.invite.REVOKE_CONFIRM'),
			exact: true
		});
		await expect(revokeConfirm).toBeVisible();

		await revokeConfirm.click();
		await expect
			.poll(
				() =>
					harness.calls.filter(
						(call) => call.method === 'DELETE' && call.path === `${INVITE_ROUTE}/${revokedId}`
					).length,
				{ timeout: 20_000 }
			)
			.toBe(1);
		await expect(confirm, 'the confirmation closed on success').toHaveCount(0);
		await expect.poll(() => harness.invitations().length, { timeout: 20_000 }).toBe(1);
		await expect(invitationRows(page), 'the revoked row is gone after the re-read').toHaveCount(1);
		await expect(rowNamed(invitationRows(page), kept)).toHaveCount(1);
		await expect(sectionCount(page, 'invitations')).toHaveText('1');
		// the mouse sits away from the toasts, so no countdown is paused while this absence is checked
		await page.mouse.move(2, 2);
		await expect(appToasts(page), 'a revoke that worked says nothing else').toHaveCount(0);

		expect(consoleFindings(shield), 'a successful revoke logged nothing').toEqual([]);
	});

	test('9 · a refused Revoke stays in the confirmation with its reason', async ({ page, app, fixture, shield }) => {
		const email = 'pending.person@example.test';
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [servedInvitation(fixture.ids, 1, email, { fullName: 'Pending Person' })],
			requests: [],
			removeRefusal: 500
		});
		await app(PAGE_PATH);
		await expect(invitationRows(page)).toHaveCount(1);

		await revokeButton(page, email).click();
		const confirm = dialogOf(page);
		await expect(confirm).toBeVisible();
		await confirm.getByRole('button', { name: phrase('modals.invite.REVOKE_CONFIRM'), exact: true }).click();
		const inline = confirm.locator('[role=alert]');
		await expect(inline, 'the reason stays next to the confirmation buttons').toBeVisible({ timeout: 20_000 });
		await expect(inline).toHaveText(phrase('toasts.REASONS.SERVER'));
		await expect(confirm, 'the confirmation did not close').toBeVisible();
		await expect(appToasts(page).filter({ hasText: phrase('toasts.invites.REMOVE_FAILED') })).toHaveCount(1);
		await expect(appToasts(page).filter({ hasText: phrase('toasts.REASONS.SERVER') })).toHaveCount(1);
		await expect.poll(() => harness.invitations().length, { timeout: 20_000 }).toBe(1);
		await expect(invitationRows(page), 'the refused revoke removed nothing').toHaveCount(1);

		await confirm.getByRole('button', { name: phrase('common.CANCEL'), exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);

		expect(consoleFindings(shield, armedExcuses(harness)), 'only the armed DELETE refusal was logged').toEqual([]);
	});

	// ------------------------------- 10-13. the requests side

	test('10 · requests to join as printed, the open count, and the read that filled them', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const adaDate = dayIso(-1);
		const benDate = dayIso(-3);
		const carolDate = dayIso(-6);
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [],
			requests: [
				servedRequest(fixture.ids, 1, 'ada@example.test', {
					fullName: 'Ada Requester',
					createdAt: adaDate,
					updatedAt: adaDate
				}),
				// a request whose name IS the address: the address is then not repeated, and a team the viewer was
				// never told about gets no "For …" part (`join-requests-section.tsx:92-97`,
				// `use-team-invitations-settings.ts:141`)
				servedRequest(fixture.ids, 2, 'ben@example.test', {
					fullName: 'ben@example.test',
					organizationTeamId: servedId(fixture.ids, 'teamA', 90),
					createdAt: benDate,
					updatedAt: benDate
				}),
				servedRequest(fixture.ids, 3, 'carol@example.test', {
					fullName: 'Carol Requester',
					status: 'ACCEPTED',
					createdAt: carolDate,
					updatedAt: carolDate
				}),
				servedRequest(fixture.ids, 4, 'dora@example.test', {
					fullName: 'Dora Requester',
					status: 'REJECTED',
					createdAt: dayIso(-8),
					updatedAt: dayIso(-7)
				}),
				// any other status is "email not confirmed" (`use-team-invitations-settings.ts:32-43`)
				servedRequest(fixture.ids, 5, 'eve@example.test', {
					fullName: 'Eve Requester',
					status: 'CREATED',
					createdAt: dayIso(-9),
					updatedAt: dayIso(-9)
				})
			]
		});
		await app(PAGE_PATH);

		await expect(requestRows(page)).toHaveCount(5);
		// open requests first, then by the served time, newest first (`use-team-invitations-settings.ts:45-54`)
		// asserted positionally: the row text also holds the avatar initials and the buttons, so it is not a name line
		const order = ['Ada Requester', 'ben@example.test', 'Carol Requester', 'Dora Requester', 'Eve Requester'];
		for (const [index, name] of order.entries()) {
			await expect(requestRows(page).nth(index), `row ${index + 1} holds the request from ${name}`).toContainText(
				name
			);
		}
		report(
			'request rows in order',
			await requestRows(page).evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''))
		);
		await expect(rowNamed(requestRows(page), 'Ada Requester')).toContainText(
			`ada@example.test · ${phrase('settings.members.REQUEST_FOR_TEAM', { team: fixture.names.teamA })} · ${mediumDate(adaDate)}`
		);
		// the whole detail line of the unknown-team row is the date: no address repeat, no "For …"
		await expect(
			rowNamed(requestRows(page), 'ben@example.test').getByText(mediumDate(benDate), { exact: true })
		).toBeVisible();
		await expect(rowNamed(requestRows(page), 'Carol Requester')).toContainText(
			phrase('settings.members.REQUEST_ACCEPTED')
		);
		await expect(rowNamed(requestRows(page), 'Dora Requester')).toContainText(
			phrase('settings.members.REQUEST_REJECTED')
		);
		await expect(rowNamed(requestRows(page), 'Eve Requester')).toContainText(
			phrase('settings.members.REQUEST_UNCONFIRMED')
		);
		// only the two open rows carry buttons (`join-requests-section.tsx:41-75`)
		await expect(section(page, 'requests').getByRole('button')).toHaveCount(4);
		const count = sectionCount(page, 'requests');
		await expect(count).toHaveText('2');
		await expect(count).toHaveAttribute('aria-label', phrase('settings.members.REQUESTS_COUNT', { count: 2 }));

		await expect.poll(() => harness.readsOf(JOIN_ROUTE), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
		const joinRead = harness.calls.find((call) => call.method === 'GET' && call.path === JOIN_ROUTE);
		const joinQuery = new URLSearchParams(joinRead?.search ?? '');
		report('join read query', Object.fromEntries(joinQuery.entries()));
		expect(joinQuery.get('where[organizationId]'), 'the requests are read organization wide').toBe(
			fixture.ids.organizationA
		);
		expect(joinQuery.get('where[tenantId]'), 'for this tenant only').toBe(fixture.ids.tenantA);

		expect(consoleFindings(shield), 'nothing but the shell store warning was logged').toEqual([]);
	});

	test('11 · more than eight requests collapse behind Show more', async ({ page, app, fixture, shield }) => {
		const requests = Array.from({ length: 10 }, (_unused, index) =>
			servedRequest(fixture.ids, 20 + index, `request${index + 1}@example.test`, {
				fullName: `Requester ${index + 1}`,
				createdAt: dayIso(-1 - index),
				updatedAt: dayIso(-1 - index)
			})
		);
		await serveInvitations(page, fixture.ids, { invitations: [], requests });
		await app(PAGE_PATH);

		const toggle = section(page, 'requests').locator('button[aria-expanded]');
		await expect(requestRows(page), 'eight rows are shown without asking').toHaveCount(8);
		await expect(toggle).toHaveText(phrase('modals.invite.SHOW_MORE', { count: 2 }));
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await toggle.click();
		await expect(requestRows(page), 'the rest appear').toHaveCount(10);
		await expect(toggle).toHaveText(phrase('modals.invite.SHOW_LESS'));
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');

		await toggle.click();
		await expect(requestRows(page), 'Show less folds them back').toHaveCount(8);
		// the count is the whole open list, not what is on screen
		await expect(sectionCount(page, 'requests')).toHaveText('10');

		expect(consoleFindings(shield), 'nothing but the shell store warning was logged').toEqual([]);
	});

	test('12 · nobody has asked to join: the empty message and no count', async ({ page, app, fixture, shield }) => {
		await serveInvitations(page, fixture.ids, { invitations: [], requests: [] });
		await app(PAGE_PATH);

		await expect(
			section(page, 'requests').getByText(phrase('settings.members.REQUESTS_EMPTY'), { exact: true })
		).toBeVisible({ timeout: 20_000 });
		await expect(requestRows(page)).toHaveCount(0);
		// the empty requests section offers nothing (`join-requests-section.tsx:145-149`)
		await expect(section(page, 'requests').getByRole('button')).toHaveCount(0);
		await expect(sectionCount(page, 'requests')).toHaveCount(0);

		expect(consoleFindings(shield), 'nothing but the shell store warning was logged').toEqual([]);
	});

	test('13 · a refused requests read: its error, and Retry reading again', async ({ page, app, fixture, shield }) => {
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [],
			requests: [servedRequest(fixture.ids, 1, 'ada@example.test', { fullName: 'Ada Requester' })],
			refuseJoinRead: 500
		});
		await app(PAGE_PATH);

		await expect(
			section(page, 'requests').getByText(phrase('settings.members.REQUESTS_ERROR'), { exact: true }),
			'the section says the read failed'
		).toBeVisible({ timeout: 40_000 });
		await expect(requestRows(page)).toHaveCount(0);

		const readsBeforeRetry = harness.readsOf(JOIN_ROUTE);
		await section(page, 'requests')
			.getByRole('button', { name: phrase('notifications.RETRY'), exact: true })
			.click();
		await expect.poll(() => harness.readsOf(JOIN_ROUTE), { timeout: 20_000 }).toBeGreaterThan(readsBeforeRetry);
		report('join reads', { beforeRetry: readsBeforeRetry, afterRetry: harness.readsOf(JOIN_ROUTE) });
		await expect(
			section(page, 'requests').getByText(phrase('settings.members.REQUESTS_ERROR'), { exact: true }),
			'still refused, still says so'
		).toBeVisible({ timeout: 40_000 });

		expect(consoleFindings(shield, armedExcuses(harness)), 'only the armed read refusal was logged').toEqual([]);
	});

	// ------------------------------- 14-15. answering a request

	test('14 · Accept and Reject answer a request, and the row shows the answer after the re-read', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const adaId = servedId(fixture.ids, 'member', 1);
		const benId = servedId(fixture.ids, 'member', 2);
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [],
			requests: [
				servedRequest(fixture.ids, 1, 'ada@example.test', { fullName: 'Ada Requester' }),
				servedRequest(fixture.ids, 2, 'ben@example.test', {
					fullName: 'Ben Requester',
					createdAt: dayIso(-2),
					updatedAt: dayIso(-2)
				})
			]
		});
		await app(PAGE_PATH);
		await expect(requestRows(page)).toHaveCount(2);

		await section(page, 'requests')
			.getByRole('button', { name: phrase('settings.members.ACCEPT_REQUEST', { name: 'Ada Requester' }) })
			.click();
		await expect
			.poll(
				() =>
					harness.calls.some(
						(call) => call.method === 'PUT' && call.path === `${JOIN_ROUTE}/${adaId}/ACCEPTED`
					),
				{ timeout: 20_000 }
			)
			.toBe(true);
		const adaRow = rowNamed(requestRows(page), 'Ada Requester');
		await expect(adaRow).toContainText(phrase('settings.members.REQUEST_ACCEPTED'), { timeout: 20_000 });
		await expect(adaRow.getByRole('button'), 'an answered request offers nothing else').toHaveCount(0);
		await expect(appToasts(page).filter({ hasText: phrase('toasts.teams.REQUEST_ACCEPTED') })).toHaveCount(1);

		await section(page, 'requests')
			.getByRole('button', { name: phrase('settings.members.REJECT_REQUEST', { name: 'Ben Requester' }) })
			.click();
		await expect
			.poll(
				() =>
					harness.calls.some(
						(call) => call.method === 'PUT' && call.path === `${JOIN_ROUTE}/${benId}/REJECTED`
					),
				{ timeout: 20_000 }
			)
			.toBe(true);
		const benRow = rowNamed(requestRows(page), 'Ben Requester');
		await expect(benRow).toContainText(phrase('settings.members.REQUEST_REJECTED'), { timeout: 20_000 });
		await expect(benRow.getByRole('button')).toHaveCount(0);
		await expect(appToasts(page).filter({ hasText: phrase('toasts.teams.REQUEST_REJECTED') })).toHaveCount(1);

		report(
			'answers written',
			harness.calls.filter((call) => call.method === 'PUT').map((call) => call.path)
		);
		await expect(sectionCount(page, 'requests'), 'no request waits any more, so no count').toHaveCount(0);
		expect(
			harness
				.requests()
				.map((item) => item.status)
				.sort(),
			'the store this file serves changed as the page asked'
		).toEqual(['ACCEPTED', 'REJECTED']);

		expect(consoleFindings(shield), 'two answered requests logged nothing').toEqual([]);
	});

	test('15 · a refused answer leaves the request open', async ({ page, app, fixture, shield }) => {
		const adaId = servedId(fixture.ids, 'member', 1);
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [],
			requests: [servedRequest(fixture.ids, 1, 'ada@example.test', { fullName: 'Ada Requester' })],
			answerRefusal: 400
		});
		await app(PAGE_PATH);
		await expect(requestRows(page)).toHaveCount(1);

		await section(page, 'requests')
			.getByRole('button', { name: phrase('settings.members.ACCEPT_REQUEST', { name: 'Ada Requester' }) })
			.click();
		await expect
			.poll(
				() =>
					harness.calls.some(
						(call) => call.method === 'PUT' && call.path === `${JOIN_ROUTE}/${adaId}/ACCEPTED`
					),
				{ timeout: 20_000 }
			)
			.toBe(true);
		const toast = appToasts(page).filter({ hasText: phrase('toasts.teams.REQUEST_NOT_ACCEPTED') });
		await expect(toast, 'the refusal is named').toHaveCount(1);
		await expect(toast).toContainText(phrase('toasts.REASONS.INVALID'));
		// the answer never landed, and nothing re-reads it (`use-accept-reject-request-to-join.ts:34-49`)
		await expect.poll(() => harness.requests()[0]?.status, { timeout: 20_000 }).toBe('REQUESTED');
		const adaRow = rowNamed(requestRows(page), 'Ada Requester');
		await expect(adaRow.getByRole('button')).toHaveCount(2);
		await expect(sectionCount(page, 'requests')).toHaveText('1');

		expect(consoleFindings(shield, armedExcuses(harness)), 'only the armed PUT refusal was logged').toEqual([]);
	});

	// ------------------------------- 16-19. the invite dialog

	test('16 · as an organization admin: the role pick, and the role id it sends', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const managerRoleId = servedId(fixture.ids, 'role', 2);
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [],
			requests: [],
			roles: [
				{ id: fixture.ids.role, name: 'ADMIN', isSystem: true, tenantId: fixture.ids.tenantA },
				{ id: managerRoleId, name: 'MANAGER', isSystem: true, tenantId: fixture.ids.tenantA },
				{
					id: servedId(fixture.ids, 'role', 3),
					name: 'EMPLOYEE',
					isSystem: true,
					tenantId: fixture.ids.tenantA
				}
			]
		});
		await app(PAGE_PATH);
		await expect(
			section(page, 'invitations').getByText(phrase('settings.members.INVITATIONS_EMPTY'), { exact: true })
		).toBeVisible({ timeout: 20_000 });

		const send = await openInviteDialog(page);
		const trigger = dialogOf(page).getByRole('combobox');
		await expect(trigger, 'an admin is offered the role of the batch').toBeVisible({ timeout: 20_000 });
		// the default is the member role (`use-invite-dialog.ts:54-56`)
		await expect(trigger).toContainText(phrase('modals.invite.roles.member'));

		await trigger.click();
		const options = page.getByRole('option');
		await expect(options).toHaveCount(3);
		await expect(options.nth(0)).toContainText(phrase('modals.invite.roles.admin'));
		await expect(options.nth(1)).toContainText(phrase('modals.invite.roles.manager'));
		await expect(options.nth(2)).toContainText(phrase('modals.invite.roles.member'));
		await options.nth(1).click();
		await expect(trigger).toContainText(phrase('modals.invite.roles.manager'));

		const email = 'fresh.person@example.test';
		await typeAddresses(page, [email]);
		await expect(chipsList(page).locator('li')).toHaveCount(1);
		await expect(send).toBeEnabled();
		await send.click();
		await expect.poll(() => harness.writesOf(EMAILS_ROUTE).length, { timeout: 20_000 }).toBe(1);
		const body = JSON.parse(String(harness.writesOf(EMAILS_ROUTE)[0]?.body)) as Record<string, unknown>;
		report('picked role id', { sent: body.roleId, servedManagerRole: managerRoleId });
		expect(body.roleId, 'the role picked is the role sent').toBe(managerRoleId);
		await expect(appToasts(page).filter({ hasText: phrase('toasts.invites.SENT', { email }) })).toHaveCount(1);

		expect(consoleFindings(shield), 'the served roles list validated cleanly').toEqual([]);
	});

	test('17 · the invite dialog: one new address sends exactly one invitation', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const email = 'fresh.person@example.test';
		const typedAt = Date.now();
		const harness = await serveInvitations(page, fixture.ids, { invitations: [], requests: [] });
		await app(PAGE_PATH);
		await expect(
			section(page, 'invitations').getByText(phrase('settings.members.INVITATIONS_EMPTY'), { exact: true })
		).toBeVisible({ timeout: 20_000 });

		const send = await openInviteDialog(page);
		await typeAddresses(page, [email]);
		// a new address is a plain chip, with no hint and a Remove button (`invite-email-field.tsx:17-20,63-77`)
		await expect(chipsList(page).locator('li')).toHaveText([email]);
		await expect(
			chipsList(page).getByRole('button', { name: phrase('modals.invite.chips.REMOVE', { email }) })
		).toHaveCount(1);
		await expect(send).toBeEnabled();
		await send.click();
		await expect.poll(() => harness.writesOf(EMAILS_ROUTE).length, { timeout: 20_000 }).toBe(1);

		const body = JSON.parse(String(harness.writesOf(EMAILS_ROUTE)[0]?.body)) as Record<string, unknown>;
		report('invite body keys', Object.keys(body));
		expect(body.emailIds, 'the new address and nothing else').toEqual([email]);
		expect(body.teamIds, 'to the active team').toEqual([fixture.ids.teamA]);
		expect(body.organizationId).toBe(fixture.ids.organizationA);
		expect(body.tenantId).toBe(fixture.ids.tenantA);
		expect(body.projectIds).toEqual([]);
		expect(body.departmentIds).toEqual([]);
		expect(body.organizationContactIds).toEqual([]);
		expect(body.inviteType).toBe('TEAM');
		expect(body.invitationExpirationPeriod).toBe('Never');
		expect(body.appliedDate).toBeNull();
		// the accept page of this app on this lane's own origin (`invite.service.ts:60`)
		expect(body.callbackUrl).toBe(`${APP_ORIGIN}/auth/accept-invite`);
		// the role an admin's dialog picked without being asked (`use-invite-dialog.ts:54-57`, the mock's one role)
		expect(body.roleId).toBe(fixture.ids.role);
		const startedWorkOn = Date.parse(String(body.startedWorkOn));
		const checkedAt = Date.now();
		report('startedWorkOn is this many hours before the send', {
			hours: Number(((typedAt - startedWorkOn) / 3_600_000).toFixed(2))
		});
		// the client dates the invitation the calendar day before it is sent (`invite.service.ts:41-42,63`:
		// `setDate(getDate() - 1)` in the browser, whose zone is this machine's): the same step taken from both ends
		// of the window the send happened in, so a daylight-saving change (a 23- or 25-hour day) holds too
		const dayBefore = (moment: number) => {
			const day = new Date(moment);
			day.setDate(day.getDate() - 1);
			return day.getTime();
		};
		expect(Number.isFinite(startedWorkOn), 'startedWorkOn is an instant').toBe(true);
		expect(startedWorkOn).toBeGreaterThanOrEqual(dayBefore(typedAt));
		expect(startedWorkOn).toBeLessThanOrEqual(dayBefore(checkedAt));

		await expect(appToasts(page).filter({ hasText: phrase('toasts.invites.SENT', { email }) })).toHaveCount(1);
		await expect(dialogOf(page), 'the dialog closed on a send that worked').toHaveCount(0);
		await expect(invitationRows(page), 'the new row came back from the re-read').toHaveCount(1);
		const created = harness.invitations().find((item) => item.email === email);
		await expect(rowNamed(invitationRows(page), email)).toContainText(
			dated('modals.invite.SENT_ON', String(created?.createdAt))
		);
		await expect(sectionCount(page, 'invitations')).toHaveText('1');

		expect(consoleFindings(shield), 'one clean send logged nothing').toEqual([]);
	});

	test('18 · several addresses at once: what the dialog says, and exactly what leaves', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const alreadyInvited = 'already.invited@example.test';
		const pendingId = servedId(fixture.ids, 'invite', 1);
		const newEmail = 'fresh.person@example.test';
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [servedInvitation(fixture.ids, 1, alreadyInvited, { fullName: 'Already Invited' })],
			requests: []
		});
		// the member address is read off the roster answer the page itself received, never typed
		const rosterAnswer = memberEmailsAnswered(page, fixture.ids.teamA);
		await app(PAGE_PATH);
		const memberEmails = await rosterAnswer;
		const memberEmail = memberEmails.find((email) => email !== newEmail);
		if (!memberEmail) {
			throw new Error('the lane answered the page with no member e-mail to invite-check');
		}
		report('member e-mails read off the roster answer', { count: memberEmails.length });
		await expect(invitationRows(page)).toHaveCount(1);

		const send = await openInviteDialog(page);
		const invalidEmail = 'not-an-address';
		await typeAddresses(page, [newEmail, alreadyInvited, memberEmail, invalidEmail]);
		const chips = chipsList(page).locator('li');
		await expect(chips).toHaveCount(4);
		await expect(chips.nth(0)).toHaveText(newEmail);
		await expect(chips.nth(1)).toHaveText(`${alreadyInvited}${phrase('modals.invite.chips.PENDING')}`);
		await expect(chips.nth(2)).toHaveText(`${memberEmail}${phrase('modals.invite.chips.MEMBER')}`);
		await expect(chips.nth(3)).toHaveText(`${invalidEmail}${phrase('modals.invite.chips.INVALID')}`);
		await expect(
			dialogOf(page).getByText(phrase('modals.invite.summary.INVALID', { count: 1 }), { exact: true })
		).toBeVisible();
		await expect(
			dialogOf(page).getByText(phrase('modals.invite.summary.MEMBER', { count: 1 }), { exact: true })
		).toBeVisible();
		await expect(
			dialogOf(page).getByText(phrase('modals.invite.summary.PENDING', { count: 1 }), { exact: true })
		).toBeVisible();
		await expect(send).toBeEnabled();
		await send.click();

		await expect
			.poll(() => harness.writesOf(EMAILS_ROUTE).length + harness.writesOf(RESEND_ROUTE).length, {
				timeout: 20_000
			})
			.toBe(2);
		const body = JSON.parse(String(harness.writesOf(EMAILS_ROUTE)[0]?.body)) as { emailIds: string[] };
		expect(body.emailIds, 'only the new address is invited').toEqual([newEmail]);
		const resent = harness.writesOf(RESEND_ROUTE);
		expect(resent.length, 'the already-invited address is sent again').toBe(1);
		const resentBody = JSON.parse(String(resent[0]?.body)) as Record<string, unknown>;
		expect(resentBody.inviteId, 'the resend carries the pending invitation id').toBe(pendingId);
		report('sent and resent', { invited: body.emailIds, resentIds: [resentBody.inviteId] });

		await expect(appToasts(page).filter({ hasText: phrase('toasts.invites.SENT_MANY', { count: 2 }) })).toHaveCount(
			1
		);
		await expect(
			appToasts(page).filter({ hasText: phrase('toasts.invites.SENT_MANY_RESENT', { count: 1 }) })
		).toHaveCount(1);
		await expect(dialogOf(page)).toHaveCount(0);
		await expect(invitationRows(page), 'the new invitation came back in the re-read').toHaveCount(2);
		await expect(sectionCount(page, 'invitations')).toHaveText('2');

		expect(consoleFindings(shield), 'a clean batch send logged nothing').toEqual([]);
	});

	test('19 · a refused send: the failure next to the addresses, and nothing added', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [
				servedInvitation(fixture.ids, 1, 'already.invited@example.test', { fullName: 'Already Invited' })
			],
			requests: [],
			sendRefusals: [400, 500]
		});
		await app(PAGE_PATH);
		await expect(invitationRows(page)).toHaveCount(1);

		const send = await openInviteDialog(page);
		await typeAddresses(page, ['fresh.person@example.test']);
		await expect(send).toBeEnabled();
		await send.click();
		const inline = dialogOf(page).locator('[role=alert]');
		await expect(inline, 'the failure sits next to the addresses').toBeVisible({ timeout: 20_000 });
		await expect(inline).toHaveText(`${phrase('modals.invite.SEND_FAILED')} ${phrase('toasts.REASONS.INVALID')}`);
		await expect(dialogOf(page), 'the dialog stays open with what was typed').toBeVisible();
		await expect(invitationRows(page), 'nothing was added').toHaveCount(1);
		// the mouse sits away from the toasts, so no countdown is paused while this absence is checked
		await page.mouse.move(2, 2);
		await expect(appToasts(page), 'a refused send says nothing in a toast').toHaveCount(0);

		await typeAddresses(page, ['second.person@example.test']);
		await send.click();
		await expect(inline).toHaveText(`${phrase('modals.invite.SEND_FAILED')} ${phrase('toasts.REASONS.SERVER')}`);
		await expect(chipsList(page).locator('li'), 'both addresses are still there').toHaveCount(2);
		await expect(invitationRows(page)).toHaveCount(1);
		await expect.poll(() => harness.writesOf(EMAILS_ROUTE).length, { timeout: 20_000 }).toBe(2);
		report('send refusals armed', {
			refusals: harness.refused().map((call) => `${call.method} ${call.path} ${call.status}`)
		});

		expect(consoleFindings(shield, armedExcuses(harness)), 'only the two armed send refusals were logged').toEqual(
			[]
		);
	});

	// ------------------------------- 20-21. who is offered this side of the page

	test('20 · a team manager who is not an organization admin: this side, without the role pick', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const email = 'pending.person@example.test';
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [servedInvitation(fixture.ids, 1, email, { fullName: 'Pending Person' })],
			requests: [servedRequest(fixture.ids, 1, 'ada@example.test', { fullName: 'Ada Requester' })]
		});
		await app(PAGE_PATH, { scenario: { manager: true, roleName: 'EMPLOYEE' } });

		await expect(invitationRows(page), 'a team manager is shown the invitations').toHaveCount(1);
		await expect(requestRows(page), 'and the requests').toHaveCount(1);
		await expect(resendButton(page, email)).toBeVisible();
		await expect(revokeButton(page, email)).toBeVisible();

		const send = await openInviteDialog(page);
		// no pick for a manager who is not an admin (`invite-form-modal.tsx:177`): the roles read this role makes
		// (`use-roles-query.ts:44,60`) is the one this lane's mock has no handler for
		await expect(dialogOf(page).getByRole('combobox'), 'no role pick').toHaveCount(0);
		await typeAddresses(page, ['fresh.person@example.test']);
		await expect(send).toBeEnabled();
		await send.click();
		await expect.poll(() => harness.writesOf(EMAILS_ROUTE).length, { timeout: 20_000 }).toBe(1);
		const body = JSON.parse(String(harness.writesOf(EMAILS_ROUTE)[0]?.body)) as Record<string, unknown>;
		report('manager send role id', { roleId: body.roleId });
		// the role came from the service's own `GET /roles/options?name=EMPLOYEE` fallback (`invite.service.ts:44-48,56`)
		expect(body.roleId).toBe(fixture.ids.role);
		await expect(
			appToasts(page).filter({ hasText: phrase('toasts.invites.SENT', { email: 'fresh.person@example.test' }) })
		).toHaveCount(1);

		expect(consoleFindings(shield), 'a manager-only view logged nothing').toEqual([]);
	});

	test('21 · a member who does not manage the team is turned away before any of this is read', async ({
		page,
		app,
		fixture,
		shield
	}) => {
		const harness = await serveInvitations(page, fixture.ids, {
			invitations: [servedInvitation(fixture.ids, 1, 'pending.person@example.test')],
			requests: [servedRequest(fixture.ids, 1, 'ada@example.test')]
		});
		await app(PAGE_PATH, { scenario: { manager: false } });

		await expect(
			page.getByText(phrase('settings.common.MANAGERS_ONLY_TITLE'), { exact: true }),
			'the managers-only card'
		).toBeVisible({ timeout: 20_000 });
		const card = page.getByText(phrase('settings.common.MANAGERS_ONLY_DESCRIPTION'), { exact: true }).locator('..');
		await expect(card, 'the managers-only card').toBeVisible();
		// the card's own link is scoped to the card: the settings nav offers "General" too (3 such links page-wide)
		await expect(
			card.getByRole('link', { name: phrase('settings.entries.teamGeneral.TITLE'), exact: true })
		).toHaveCount(1);
		await expect(section(page, 'invitations')).toHaveCount(0);
		await expect(section(page, 'requests')).toHaveCount(0);
		// both sections live inside the gate, so nothing was ever read
		expect(
			harness.calls
				.filter((call) => call.path === INVITE_ROUTE || call.path === JOIN_ROUTE)
				.map((call) => `${call.method} ${call.path}`),
			'no invitation or request read happened'
		).toEqual([]);

		expect(consoleFindings(shield), 'the refused view logged nothing').toEqual([]);
	});
});

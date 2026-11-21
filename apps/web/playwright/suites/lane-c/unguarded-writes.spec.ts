import { expect, test, type ApiCall } from '../../api-fixtures';
import { APP_ORIGIN, receivedTokens } from '../../helpers';

/**
 * Which write handlers of this app do NOT ask where the request came from — and what a cross-site write meets at
 * each of them today.
 *
 * `AUDIT.md` finding 1: `scripts/collect-foreign-origin-routes.mjs:114` builds the foreign-origin manifest from a
 * guard *call*, so a handler with no guard produces no entry and no test. The suite therefore proves "the guarded
 * handlers refuse" and is silent on "which handlers were never guarded". This file is that missing half: at each
 * handler that names no origin guard, a request the browser calls cross-site must be answered exactly like a
 * request from a client that says nothing — i.e. the answer did not come from an origin check.
 *
 * ⚠ DISCOVERED, NOT RUN — no case in this file was executed. Nothing here was started before the owner stopped the
 * effort for a fleet inference-engine update, so no status, body or mock-log line below was read off a log. Every
 * claim cites the source line it came from, and every assertion is one that source guarantees; deliberately no
 * status code is pinned, because I never saw one. The first run must (a) prove these assertions and (b) pin the
 * status + body + mock triple per case, the way `session-guard.spec.ts` pins its statuses — each failure message
 * below already prints all three. Until that run, cite this file as "the unguarded set, listed with file evidence",
 * never as measured behaviour.
 *
 * The set, re-derived from today's tree rather than copied from the audit:
 *
 *   find apps/web/app/api -name route.ts | wc -l                                  → 415 files
 *   write verb entries across them (POST/PUT/PATCH/DELETE)                       → 324
 *   credited a guard before any upstream call (the collector's own rules)         → 286
 *   credited none                                                                → 38, in 35 route files
 *
 * `AUDIT.md` / `audit-evidence.md` §C/§E measured 325 write entries, 37 uncredited, 33 handlers, against
 * `b19990f6e`; the tree moved, and so did the counts. The re-run also separated three files the audit's list counts
 * as unguarded but which ARE origin-guarded, just not in the vocabulary the collector knows
 * (`GUARD`/`GUARDED_HELPERS` at `collect-foreign-origin-routes.mjs:31,37`). They are pinned as guarded below, with
 * the evidence, so this file does not repeat them as a finding — see `describe('…origin-guarded by other means')`.
 * A per-file scan cannot see a guard that lives in another file: that is `AUDIT.md` finding 2 with a concrete cost.
 *
 * Two things the run still has to answer, and this file does not claim:
 *   - which of these the owner means to guard. A lane pins, it does not decide (`AUDIT.md` finding 1 leaves that
 *     to the owner); nothing here weakens a guard or the hermetic shield.
 *   - per route, whether the mock was asked. Every failure message prints the log, so a run produces it.
 */

/** A site that is not this app — the same one `session-guard.spec.ts` and `suites/api/foreign-origin.spec.ts` use. */
const FOREIGN_ORIGIN = 'https://some-other-site.example';

/** What `refuseForeignOrigin` / `refuseForeignWrite` answer (`core/services/server/same-origin-request.ts:48-53`). */
const GUARD_STATUS = 403;
const GUARD_MESSAGE = 'Cross-site request refused';

const isGuardRefusal = (status: number, text: string): boolean => {
	if (status !== GUARD_STATUS) return false;
	try {
		return (JSON.parse(text) as { message?: unknown }).message === GUARD_MESSAGE;
	} catch {
		return false;
	}
};

const triple = (requests: Array<{ method: string; path: string; status: number }>): string[] =>
	requests.map((request) => `${request.method} ${request.path} ${request.status}`);

type Probe = {
	verb: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** The path as the app serves it, dynamic segments filled with values a local run can use. */
	path: string;
	/** Under `apps/web/app/api/`: the handler that was read to decide it names no origin guard. */
	file: string;
	/** The evidence line in that file (or in the helper it forwards to). */
	evidence: string;
	/** A body the handler's own field list takes, so the case is not reading a validation refusal. */
	body?: Record<string, unknown>;
};

/**
 * A link shape the invoice checkout validates before anything else (`isSharedInvoiceLink`,
 * `core/lib/utils/shared-invoice.ts:23-25`: a UUID and three base64url parts). It is not a real share link; the
 * point of the case is only whether this app refused before asking the API.
 */
const INVOICE_ID = 'd0000000-0000-4000-8000-000000000000';
const INVOICE_TOKEN = 'aW52YWxpZC5saW5r.aW52YWxpZC5wYXJ0.aW52YWxpZC5zaWdu';
const PROBE_EMAIL = 'lane-c-probe@localhost.invalid';

/**
 * Every write handler whose route file names none of `refuseForeignOrigin`, `refuseForeignWrite`, `forwardToGauzy`,
 * `refuseUnlessPermitted` or `refuseWithoutPermission`: 32 of the 35 files my scan flagged.
 */
const UNGUARDED_WRITES: Probe[] = [
	{
		verb: 'POST',
		path: '/api/account-deletion/confirm',
		file: 'account-deletion/confirm/route.ts',
		evidence: ':4-6 forwards the body token and planHash through proxyAccountDeletion',
		body: { token: 'not-a-real-token', planHash: 'not-a-real-hash' }
	},
	{
		verb: 'POST',
		path: '/api/account-deletion/me',
		file: 'account-deletion/me/route.ts',
		evidence: ':8-10 POST forwards through proxyAccountDeletionMe',
		body: {}
	},
	{
		verb: 'POST',
		path: '/api/account-deletion/request',
		file: 'account-deletion/request/route.ts',
		evidence: ':4-6; its own required field is the email (core/services/server/requests/account-deletion.ts:27-38)',
		body: { email: PROBE_EMAIL }
	},
	{
		verb: 'POST',
		path: '/api/account-deletion/verify',
		file: 'account-deletion/verify/route.ts',
		evidence: ':4-6 forwards the body token',
		body: { token: 'not-a-real-token' }
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/backchannel-logout',
		file: 'auth/ever-id/backchannel-logout/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file (grepped today)'
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/confirm',
		file: 'auth/ever-id/confirm/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/finish-setup',
		file: 'auth/ever-id/finish-setup/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/signup-handoff',
		file: 'auth/ever-id/signup-handoff/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/start',
		file: 'auth/ever-id/start/route.ts',
		evidence: 'no origin guard; with the switch off (the default) its own table says 404, nothing called ' +
			'(route.ts:30-33)',
		body: {}
	},
	{
		verb: 'PUT',
		path: '/api/auth/ever-id/start',
		file: 'auth/ever-id/start/route.ts',
		evidence: 'exported verb of the same file; "any other method → 404, nothing called" (route.ts:32)',
		body: {}
	},
	{
		verb: 'PATCH',
		path: '/api/auth/ever-id/start',
		file: 'auth/ever-id/start/route.ts',
		evidence: 'exported verb of the same file',
		body: {}
	},
	{
		verb: 'DELETE',
		path: '/api/auth/ever-id/start',
		file: 'auth/ever-id/start/route.ts',
		evidence: 'exported verb of the same file',
		body: {}
	},
	{
		verb: 'POST',
		path: '/api/auth/finish-setup',
		file: 'auth/finish-setup/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/login',
		file: 'auth/login/route.ts',
		evidence: 'no origin or sec-fetch read; the handler writes session cookies ' +
			'(AUDIT.md finding 1 names this family)',
		body: { email: PROBE_EMAIL }
	},
	{
		verb: 'POST',
		path: '/api/auth/refresh',
		file: 'auth/refresh/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/register',
		file: 'auth/register/route.ts',
		evidence: 'no origin or sec-fetch read; its e-mail link is built from the request URL (route.ts:31)',
		body: { email: PROBE_EMAIL }
	},
	{
		verb: 'POST',
		path: '/api/auth/request-password',
		file: 'auth/request-password/route.ts',
		evidence: 'no origin guard; the reset link comes from the configured origin, never from the request ' +
			'(route.ts:16-21, appPublicOrigin at core/services/server/requests/account-deletion.ts:75)'
	},
	{
		verb: 'POST',
		path: '/api/auth/reset-password',
		file: 'auth/reset-password/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/send-code',
		file: 'auth/send-code/route.ts',
		evidence: 'no origin guard; its callbackUrl is the request URL, not the Origin header (route.ts:8)'
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-email',
		file: 'auth/signin-email/route.ts',
		evidence: 'no origin guard; the sign-in link is built from the configured origin (route.ts:8-13)'
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-email-confirm',
		file: 'auth/signin-email-confirm/route.ts',
		evidence: 'no origin or sec-fetch read; the handler opens a session'
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-email-password',
		file: 'auth/signin-email-password/route.ts',
		evidence: 'no origin or sec-fetch read; the handler opens a session'
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-email-social-login',
		file: 'auth/signin-email-social-login/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-workspace',
		file: 'auth/signin-workspace/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/two-factor/verify',
		file: 'auth/two-factor/verify/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/verify/token',
		file: 'auth/verify/token/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/[...nextauth]',
		file: 'auth/[...nextauth]/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file'
	},
	{
		verb: 'POST',
		path: '/api/auth/_signin-workspace',
		file: 'auth/_signin-workspace/route.ts',
		evidence: 'no origin or sec-fetch read; the handler writes session cookies'
	},
	{
		verb: 'POST',
		path: '/api/invite/accept',
		file: 'invite/accept/route.ts',
		evidence: ':29-38 checks only the media type and that the body is a JSON object; :51-53 then hands the ' +
			'caller Origin to the API as the origin its welcome links are built on (appOriginOf at :188-194)',
		body: { email: PROBE_EMAIL, code: 'lane-c-probe-code' }
	},
	{
		verb: 'POST',
		path: '/api/invite/validate-by-code',
		file: 'invite/validate-by-code/route.ts',
		evidence: ':7-18 validates the code and email fields only, then verifyInviteCodeRequest',
		body: { email: PROBE_EMAIL, code: 'lane-c-probe-code' }
	},
	{
		verb: 'POST',
		path: '/api/log',
		file: 'log/route.ts',
		evidence: ':6-44 reads the body and writes it to a log file; nothing asks where the request came from'
	},
	{
		verb: 'POST',
		path: '/api/organization-team-join',
		file: 'organization-team-join/route.ts',
		evidence: ':19-24 forwards the body with no session and no guard, while the GET ten lines above runs ' +
			'authenticatedGuard (:6-8)'
	},
	{
		verb: 'POST',
		path: '/api/organization-team-join/resend-code',
		file: 'organization-team-join/resend-code/route.ts',
		evidence: ':5-10 forwards the body'
	},
	{
		verb: 'POST',
		path: '/api/organization-team-join/validate',
		file: 'organization-team-join/validate/route.ts',
		evidence: ':5-10 forwards the body'
	},
	{
		verb: 'POST',
		path: `/api/public/invoice-payments/invoice/${INVOICE_ID}/${INVOICE_TOKEN}/checkout`,
		file: 'public/invoice-payments/invoice/[id]/[token]/checkout/route.ts',
		evidence: 'no origin guard on the request; the body check is origin-dependent ' +
			'(core/services/server/public-invoice-proxy.ts:62-78)'
	}
];

async function probe(api: ApiCall, probeSpec: Probe, headers: Record<string, string>, anonymous = false) {
	const response = await api(probeSpec.path, {
		method: probeSpec.verb,
		body: probeSpec.body ?? {},
		...(anonymous ? { anonymous: true } : {}),
		headers
	});
	return { status: response.status(), text: await response.text() };
}

test.describe('write handlers that name no origin guard: cross-site answered as a headerless request', () => {
	for (const probeSpec of UNGUARDED_WRITES) {
		test(`${probeSpec.verb} ${probeSpec.path}`, async ({ api, mock }) => {
			const crossSite = await probe(api, probeSpec, {
				origin: FOREIGN_ORIGIN,
				'sec-fetch-site': 'cross-site'
			});
			const headerless = await probe(api, probeSpec, {});
			const log = triple(await mock.requests());

			/**
			 * The witness every assertion message carries, so the first run of this file produces today's status,
			 * body and mock log for each route without anybody having to guess them: a pinned value gets added to
			 * this file from a log line, not from a report.
			 */
			const witness =
				`today's answer is not yet pinned · ` +
				`${probeSpec.verb} ${probeSpec.path} (${probeSpec.file} — ${probeSpec.evidence}) · ` +
				`cross-site: ${crossSite.status} ${crossSite.text.slice(0, 240)} · ` +
				`no Origin/no Sec-Fetch-Site: ${headerless.status} ${headerless.text.slice(0, 240)} · ` +
				`mock log: ${JSON.stringify(log)}`;

			expect(
				isGuardRefusal(crossSite.status, crossSite.text),
				`${witness} — this handler answered with the shared origin guard's refusal after all, so it is ` +
					'guarded and must be moved out of this list (that is a finding about the list, not about a fix)'
			).toBe(false);

			// Nothing in the handler reads the two headers, so it cannot tell these two callers apart. A difference
			// here means something did read them — worth knowing, and worth pinning what it decided.
			expect(
				headerless.status,
				`${witness} — a client that reports nothing was answered differently from a browser that reports ` +
					'cross-site, so some code here does read one of those headers'
			).toBe(crossSite.status);

			expect(
				isGuardRefusal(headerless.status, headerless.text),
				`${witness} — the headerless client got the guard's refusal while the cross-site one did not`
			).toBe(false);
		});
	}
});

test.describe('the same handlers, checked against what would prove a guard exists', () => {
	/**
	 * The control that makes every case above mean something: these exact headers do trigger the guard where one
	 * is installed. `POST /api/chat/conversations` reaches it through `forwardToGauzy`
	 * (`core/services/server/forward-to-gauzy.ts:89-90`), which answers before any upstream call
	 * (`same-origin-request.ts:48-53`), so the empty mock log is part of the assertion, not a hope.
	 */
	test('a guarded write with the same headers is refused here, and the API is not asked', async ({ api, mock }) => {
		const response = await api('/api/chat/conversations', {
			method: 'POST',
			body: { title: 'cross-site probe' },
			anonymous: true,
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const text = await response.text();

		expect(response.status(), `the guard did not refuse this guarded write (${text})`).toBe(GUARD_STATUS);
		expect(
			(JSON.parse(text) as { message?: string }).message,
			`the refusal did not carry the guard's own body (${text})`
		).toBe(GUARD_MESSAGE);
		expect(await mock.requests(), 'a refusal made here still asked the API').toEqual([]);
	});

	/**
	 * `POST /api/organization-team-join` is the sharpest one in `AUDIT.md` finding 1: no origin guard and no
	 * session either. `requestToJoinRequest` (`core/services/server/requests/request-to-join-team.ts:14-19`) passes
	 * no `bearer_token`, and `serverFetch` writes no `authorization` header without one
	 * (`core/services/server/fetch.ts:91-93`), so the mock's own record should show a call and no credential.
	 * Both halves are the claim, and the mock is the witness of each.
	 */
	test('POST /api/organization-team-join forwards a cross-site write, and sends no credential with it', async ({
		api,
		mock
	}) => {
		const probeSpec = UNGUARDED_WRITES.find(
			(candidate) => candidate.path === '/api/organization-team-join' && candidate.verb === 'POST'
		) as Probe;
		const crossSite = await probe(api, probeSpec, { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }, true);
		const calls = await mock.calls('/api/organization-team-join');
		const tokens = await receivedTokens('/api/organization-team-join');

		expect(
			isGuardRefusal(crossSite.status, crossSite.text),
			`POST /api/organization-team-join was refused by an origin guard (${crossSite.status} ` +
				`${crossSite.text}) — it is guarded after all, so the finding is closed and this case must say so`
		).toBe(false);
		expect(calls.length, `the write was not forwarded to the API either: ${crossSite.status} ${crossSite.text}`).toBeGreaterThan(0);
		expect(
			tokens,
			`the forwarded write carried a bearer after all: ${JSON.stringify(tokens)} (upstream path is ` +
				"'organization-team-join, appended to GAUZY_API_SERVER_URL at core/services/server/fetch.ts:110)"
		).toEqual([]);
	});

	/**
	 * The invoice checkout's guard is on a *body value* and it only binds a browser: `isPaymentReturnUrl` passes
	 * when the request carried no Origin at all (`!origin || url.origin === origin`,
	 * `core/lib/utils/shared-invoice.ts:106-118`, used at `core/services/server/public-invoice-proxy.ts:62-78`).
	 * Statuses below are read off that source, not off a run — the run has to confirm them.
	 */
	const checkout: Probe = UNGUARDED_WRITES.find((candidate) =>
		candidate.path.endsWith('/checkout')
	) as Probe;
	const foreignReturn = `${FOREIGN_ORIGIN}/shared-invoice?paid=1`;
	const ownReturn = `${APP_ORIGIN}/shared-invoice?paid=1`;

	test('checkout: a foreign Origin whose returnUrl matches it is forwarded', async ({ api, mock }) => {
		const response = await api(checkout.path, {
			method: 'POST',
			anonymous: true,
			body: { returnUrl: foreignReturn },
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const text = await response.text();
		const log = triple(await mock.requests());

		expect(
			isGuardRefusal(response.status(), text),
			`the checkout refused as the shared guard does (${response.status()} ${text}) — it does not use it`
		).toBe(false);
		expect(log.length, `nothing was forwarded, so the body check stopped it: ${response.status()} ${text}`).toBeGreaterThan(0);
	});

	test('checkout: a client with no Origin may name any host as the returnUrl', async ({ api, mock }) => {
		const response = await api(checkout.path, {
			method: 'POST',
			anonymous: true,
			body: { returnUrl: foreignReturn }
		});
		const text = await response.text();
		const log = triple(await mock.requests());

		expect(
			log.length,
			`the headerless client was stopped by the return-address check (status ${response.status()} ${text}) — ` +
				'which would mean isPaymentReturnUrl does not pass an absent Origin, as core/lib/utils/' +
				'shared-invoice.ts:118 reads'
		).toBeGreaterThan(0);
	});

	test('checkout: a foreign Origin naming THIS app as the returnUrl is refused, 400, before the API', async ({
		api,
		mock
	}) => {
		const response = await api(checkout.path, {
			method: 'POST',
			anonymous: true,
			body: { returnUrl: ownReturn },
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const text = await response.text();

		// public-invoice-proxy.ts:66-68 (invalid link/refusal bodies at :16)
		expect(response.status(), `the return-address check answered ${response.status()} (${text})`).toBe(400);
		expect((JSON.parse(text) as { message?: string }).message, `the 400 did not say why (${text})`).toBe(
			'Invalid return address'
		);
		expect(await mock.requests(), 'the refusal came after the API was asked').toEqual([]);
	});
});

test.describe('unguarded in the collector vocabulary, origin-guarded by other means', () => {
	/**
	 * `POST /api/board/notify` (`app/api/board/notify/route.ts:37-41`) refuses any Origin that is not exactly the
	 * configured Board origin — including none — with `{ message: 'Forbidden' }`
	 * (`core/services/server/board-cors.ts:26-28`, `isTrustedBoardOrigin` at `core/lib/board/board-app.ts:81-87`).
	 * That is stricter than the shared guard, which lets a headerless client through
	 * (`session-guard.spec.ts`'s "a client that sends neither Origin nor Sec-Fetch-Site passes the write guard").
	 * It is in `audit-evidence.md` §E's list of 33 only because the collector's vocabulary
	 * (`collect-foreign-origin-routes.mjs:31,37`) knows no third origin guard.
	 */
	test('POST /api/board/notify refuses a foreign Origin, and a missing one, with its own body', async ({ api, mock }) => {
		const foreign = await api('/api/board/notify', {
			method: 'POST',
			body: { kind: 'mention', receiverEmployeeIds: [], roomId: 'lane-c-probe-room' },
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const foreignText = await foreign.text();
		const none = await api('/api/board/notify', {
			method: 'POST',
			body: { kind: 'mention', receiverEmployeeIds: [], roomId: 'lane-c-probe-room' }
		});
		const noneText = await none.text();

		expect(foreign.status(), `the Board origin allowlist did not refuse a foreign Origin (${foreignText})`).toBe(403);
		expect(
			(JSON.parse(foreignText) as { message?: string }).message,
			`the refusal carried the shared guard's body instead of the Board's (${foreignText})`
		).toBe('Forbidden');
		expect(none.status(), `a client that sent no Origin passed the Board allowlist (${noneText})`).toBe(403);
		expect(await mock.requests(), 'either refusal asked the API anyway').toEqual([]);
	});

	/**
	 * The two aliases: the guard lives in the file whose handler they import, so a per-file scan (mine, and the
	 * collector's) credits them nothing while the request is refused before anything is read.
	 */
	for (const alias of [
		{
			probe: '/api/timer/toogle',
			guardedAt: 'app/api/timer/toggle/route.ts:7-8 (refuseForeignOrigin is the first statement of POST)'
		},
		{
			probe: `/api/daily-plan/${INVOICE_ID}/task`,
			guardedAt: 'app/api/daily-plan/plan/[planId]/route.ts:8 and :33 (POST and PUT alike)'
		}
	]) {
		test(`POST ${alias.probe} is refused by the guard in the handler it imports`, async ({ api, mock }) => {
			const response = await api(alias.probe, {
				method: 'POST',
				body: {},
				anonymous: true,
				headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
			});
			const text = await response.text();

			expect(
				response.status(),
				`${alias.probe} is not guarded after all (${response.status()} ${text}); guard claimed at ${alias.guardedAt}`
			).toBe(GUARD_STATUS);
			expect(
				(JSON.parse(text) as { message?: string }).message,
				`${alias.probe} answered with a different body than the shared guard's (${text})`
			).toBe(GUARD_MESSAGE);
			expect(await mock.requests(), `${alias.probe} asked the API before refusing`).toEqual([]);
		});
	}
});

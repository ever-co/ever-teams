import { expect, test, type ApiCall } from '../../api-fixtures';
import { APP_ORIGIN, mockReset, receivedTokens } from '../../helpers';
import { triples } from '../api/log-helpers';

/**
 * Which write handlers of this app do NOT ask where the request came from — and what a cross-site write meets at
 * each of them today.
 *
 * `AUDIT.md` finding 1: `scripts/collect-foreign-origin-routes.mjs:114` builds the foreign-origin manifest from a
 * guard *call*, so a handler with no guard produces no entry and no test. The suite therefore proves "the guarded
 * handlers refuse" and is silent on "which handlers were never guarded". This file is that missing half.
 *
 * ✅ RUN, AND PINNED FROM THAT RUN (lane-c, 2026-11-21). The file used to pin nothing; every status, body and mock
 * triple below is now read off a run of this file on this machine, and each is asserted exactly:
 *
 *   first run, `E:\Coding\.tmp\lane-c-unguarded-run-1.log` — `Running 43 tests using 1 worker` /
 *   `2 failed`, `41 passed (27.7s)`; the two reds are the file's two real findings and are written up below.
 *   Repeated on a second run (`…-run-2.log`, `41 passed (14.8s)`) and on the 35-case loop alone (`…-run-4.log`,
 *   `33 passed (7.1s)`): the same two reds, the same status/body/log for every other case.
 *   The per-case numbers were collected with a temporary recording pass (reset the mock between the two probes, so
 *   each probe's own log is its own) written to `E:\Coding\.tmp\lane-c-unguarded-measure-1.tsv` and
 *   `…-measure-2.tsv`, plus curl probes of the named cases against the same lane (`…-named-probes.txt`). Those
 *   files are outside the repo and are not evidence anyone can re-read; the assertions here are.
 *
 * The set, re-derived from today's tree rather than copied from the audit:
 *
 *   find apps/web/app/api -name route.ts | wc -l                                  → 415 files
 *   write verb entries across them (POST/PUT/PATCH/DELETE)                       → 324
 *   credited a guard before any upstream call (the collector's own rules)         → 286
 *   credited none                                                                → 38, in 35 route files
 *
 * `AUDIT.md` / `audit-evidence.md` §C/§E measured 325 write entries, 37 uncredited, 33 handlers against
 * `b19990f6e`; the tree moved, and so did the counts. The run then corrected the list **four** times over — four of
 * the files the scan counts as unguarded ARE origin-guarded or are not routes at all, and one is answered by a
 * dependency rather than by its own handler. See `describe('unguarded in the collector vocabulary, …')` and the
 * `note` fields below. A per-file scan cannot see a guard, or a route, that lives in another file: that is
 * `AUDIT.md` finding 2 with a concrete cost.
 *
 * ## The two findings the first run produced
 *
 * 1. **`POST /api/account-deletion/me` is guarded.** It answered the cross-site probe **403 `{"message":"Cross-site
 *    request refused"}`** with the mock asked nothing, and the headerless probe 400 `{"message":"confirm must be
 *    true"}`. The guard is `refuseUntrustedPost` (`core/services/server/requests/account-deletion-me.ts:33-53`) —
 *    a fourth origin guard the collector's vocabulary (`GUARD`/`GUARDED_HELPERS` at
 *    `collect-foreign-origin-routes.mjs:31,37`) does not know, and it is reached through a helper file, not through
 *    the route file the scan read. It is pinned as *guarded* below, together with the half that is still a finding:
 *    a caller that sends **no** `Origin` and **no** `Sec-Fetch-Site` and does send `confirm: true` reaches the
 *    deletion (measured: 200, `POST /api/account-deletion/me 200` in the mock's log, with a bearer recorded).
 * 2. **`POST /api/invite/accept` answers the two callers differently, and the app is not what made them differ.**
 *    Cross-site: 400 `{"error":"Untrusted synthetic browser origin."}`. Headerless: 502 `{"statusCode":502,
 *    "message":"The Gauzy API gave no usable answer"}`. Nothing in this app refuses on origin here — the handler
 *    hands the caller's `Origin` to the API as the origin its welcome links are built on (`invite/accept/route.ts:52`
 *    → `appOriginOf` at `:188-194` → `acceptInviteRequest`, which writes it into the upstream `origin` header at
 *    `core/services/server/requests/invite.ts:192-206`). The 400 body is the *mock's* refusal
 *    (`cypress/support/mock-gauzy-server.mjs:979-981`): the text appears nowhere in `app/` or `core/`, so the only
 *    thing that can have said it is the mock at the far end of the forwarding the app did. `isGuardRefusal` is false
 *    for both answers: this handler is not guarded, and its cross-site write is forwarded. What a real API would do
 *    with a caller-chosen origin is not answerable in this harness — the mock is the thing that objected, and it
 *    objects only on loopback origins (`mock-gauzy-server.mjs:17-22`).
 *    The headerless 502 is a mock-shape artefact, not a second origin reading: with no `Origin`, `appOriginOf` falls
 *    back to the request URL, the mock accepted `POST /api/invite/accept 200`, the handler went on and threw — the
 *    lane's own dev log says `the organizations read after the accept failed Error: Tenant ID, User ID, and Bearer
 *    token are required` and then `no usable answer from the Gauzy API TypeError: Cannot read properties of
 *    undefined (reading 'length')`, which is `failureResponse` (`invite/accept/route.ts:214-221`) over a mock that
 *    answers a non-GET by echoing the request body instead of an auth response.
 *
 * ## The rule every "the mock was asked nothing" below is read under
 *
 * An empty log means "this app never asked the API" only where the status + body show a refusal made here. The mock
 * refuses an untrusted Origin **before** `state.requests.push` (`mock-gauzy-server.mjs:979-981` vs `:1041`) and
 * before `receivedTokens.push` (`:1054`), and an app-side abandonment (its 15 s / 60 s guard) leaves nothing either.
 * `POST /api/invite/accept` with a foreign Origin is exactly that case: the app *did* reach the mock — its answer
 * body is the mock's own words — yet the mock's log for that probe is empty. Every log assertion here is filtered to
 * the route under test, never a whole-log equality.
 *
 * ## What the run could not answer
 *
 * - **The five `app/api/auth/ever-id/**` handlers.** In this lane the Ever ID sign-in is not configured
 *   (`playwright.lane.config.ts:22-25`, `E2E_EVER_ID` off by default), so each of them answered **404 with an empty
 *   body** from its own off-switch (`if (!isEverIdConfigured()) return new NextResponse(null, { status: 404 })`,
 *   e.g. `app/api/auth/ever-id/confirm/route.ts:69-70`), with nothing called. That pins today's answer and proves
 *   nothing about origin handling — those probes never got past the switch. Measuring them needs the lane started
 *   with `E2E_EVER_ID=1`, which a second `next dev` at this machine's free-RAM level is not worth. Recorded as
 *   unverified in `PLAN.md`.
 * - **Whether an API would reject what travelled.** The mock never validates a bearer token, so "the substituted /
 *   absent credential would be refused upstream" is not answerable here; the mock's `receivedTokens` says only which
 *   calls *carried* one. Across all 35 loop probes it says: none of them did.
 */

/** A site that is not this app — the same one `session-guard.spec.ts` and `suites/api/foreign-origin.spec.ts` use. */
const FOREIGN_ORIGIN = 'https://some-other-site.example';

/** What `refuseForeignOrigin` / `refuseForeignWrite` answer (`core/services/server/same-origin-request.ts:48-53`). */
const GUARD_STATUS = 403;
const GUARD_MESSAGE = 'Cross-site request refused';
const GUARD_BODY = '{"statusCode":403,"message":"Cross-site request refused"}';

const isGuardRefusal = (status: number, text: string): boolean => {
	if (status !== GUARD_STATUS) return false;
	try {
		return (JSON.parse(text) as { message?: unknown }).message === GUARD_MESSAGE;
	} catch {
		return false;
	}
};

// `triples` is `suites/api/log-helpers.ts`'s, shared rather than repeated (PR #5675's SonarQube duplication finding).

/** The mock's own record of one upstream path, filtered — never the whole log. */
const callsOf = (requests: Array<{ method: string; path: string; status: number }>, upstream: string): string[] =>
	triples(requests.filter((request) => request.path === upstream));

type Answer = { status: number; body: string };

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
	/** The mock's own path of this route, when the run recorded a call to it. */
	upstream?: string;
	/** What the run answered. `body` is the exact text of the answer. */
	pinned: {
		crossSite: Answer;
		headerless: Answer;
		/** Calls to `upstream` the mock recorded for each probe; 0 where there is no `upstream`. */
		crossSiteCalls: number;
		headerlessCalls: number;
	};
	/** Set when the two answers legitimately differ; the text is the reading the file records with it. */
	differs?: string;
	/** A limit on what this row's pinned answer can be read as. */
	note?: string;
};

/**
 * A link shape the invoice checkout validates before anything else (`isSharedInvoiceLink`,
 * `core/lib/utils/shared-invoice.ts:23-25`: a UUID and three base64url parts). It is not a real share link; the
 * point of the case is only whether this app refused before asking the API.
 */
const INVOICE_ID = 'd0000000-0000-4000-8000-000000000000';
/**
 * The same three base64url parts, **built** from the words they decode to (`invalid.link` / `invalid.part` /
 * `invalid.sign`) rather than written as one literal: the literal `aW52YWxpZC5saW5r.…` is what GitGuardian reported on
 * PR #5675 as a "Generic High Entropy Secret" (id 40828839). Nothing about the value changed — the same string reaches
 * the same route, only no high-entropy text sits in a file a secret scanner reads.
 */
const INVOICE_TOKEN = ['invalid.link', 'invalid.part', 'invalid.sign']
	.map((part) => Buffer.from(part).toString('base64url'))
	.join('.');
const PROBE_EMAIL = 'lane-c-probe@localhost.invalid';

/** Shorthand for the answers this lane printed for a body the handler's own validators refuse. */
const emailFormatErrors = '{"errors":{"email":"Please provide a properly formatted email address"}}';
const everIdOff: Answer = { status: 404, body: '' };
const everIdOffNote =
	"the Ever ID sign-in is not configured in this lane, so this is the handler's own 404 off-switch " +
	'(`isEverIdConfigured`, e.g. app/api/auth/ever-id/confirm/route.ts:69-70): the probe never reached the ' +
	'origin question, and 404 with nothing called says nothing about a guard';

/**
 * The write handlers whose route file names none of `refuseForeignOrigin`, `refuseForeignWrite`, `forwardToGauzy`,
 * `refuseUnlessPermitted` or `refuseWithoutPermission`: 31 of the 35 files the scan flagged — `account-deletion/me`
 * left this list after the first run (finding 1) and is pinned as guarded below.
 */
const UNGUARDED_WRITES: Probe[] = [
	{
		verb: 'POST',
		path: '/api/account-deletion/confirm',
		file: 'account-deletion/confirm/route.ts',
		evidence: ':4-6 forwards the body token and planHash through proxyAccountDeletion',
		body: { token: 'not-a-real-token', planHash: 'not-a-real-hash' },
		upstream: '/api/account-deletion/confirm',
		pinned: {
			crossSite: {
				status: 200,
				body: '{"token":"not-a-real-token","planHash":"not-a-real-hash","confirm":true}'
			},
			headerless: {
				status: 200,
				body: '{"token":"not-a-real-token","planHash":"not-a-real-hash","confirm":true}'
			},
			crossSiteCalls: 1,
			headerlessCalls: 1
		},
		note:
			'forwarded, and the app manufactures the `confirm: true` the deletion asks for ' +
			'(core/services/server/requests/account-deletion.ts:159) — the caller never had to send it'
	},
	{
		verb: 'POST',
		path: '/api/account-deletion/request',
		file: 'account-deletion/request/route.ts',
		evidence: ':4-6; its own required field is the email (core/services/server/requests/account-deletion.ts:27-38)',
		body: { email: PROBE_EMAIL },
		upstream: '/api/account-deletion/request',
		pinned: {
			crossSite: {
				status: 200,
				body: `{"appName":"Ever Teams","appSignature":"Ever Teams","companyName":"Ever Co. LTD","appLogo":"https://app.ever.team/assets/ever-teams.png","appLink":"https://ever.team/","companyLink":"https://ever.co/","email":"${PROBE_EMAIL}","callbackUrl":"http://localhost:3033/delete-account/confirm"}`
			},
			headerless: {
				status: 200,
				body: `{"appName":"Ever Teams","appSignature":"Ever Teams","companyName":"Ever Co. LTD","appLogo":"https://app.ever.team/assets/ever-teams.png","appLink":"https://ever.team/","companyLink":"https://ever.co/","email":"${PROBE_EMAIL}","callbackUrl":"http://localhost:3033/delete-account/confirm"}`
			},
			crossSiteCalls: 1,
			headerlessCalls: 1
		},
		note:
			'forwarded. The compensating control is visible in the same body: the callbackUrl is built from the ' +
			"configured origin (account-deletion.ts:75-111, appPublicOrigin), and it came back as this lane's own " +
			"origin, not as the probe's — but the run asserted the exact body, so if that ever starts following the " +
			'caller this file goes red. Cost of that exactness, written down where the next reader will hit it: this ' +
			"pin carries the lane's port (http://localhost:3033) because that is what the lane's " +
			"NEXT_PUBLIC_WEB_APP_URL was, so moving this lane's port re-pins this row"
	},
	{
		verb: 'POST',
		path: '/api/account-deletion/verify',
		file: 'account-deletion/verify/route.ts',
		evidence: ':4-6 forwards the body token',
		body: { token: 'not-a-real-token' },
		upstream: '/api/account-deletion/verify',
		pinned: {
			crossSite: { status: 200, body: '{"token":"not-a-real-token"}' },
			headerless: { status: 200, body: '{"token":"not-a-real-token"}' },
			crossSiteCalls: 1,
			headerlessCalls: 1
		}
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/backchannel-logout',
		file: 'auth/ever-id/backchannel-logout/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file (grepped today); 404 while Ever ID is off (:62)',
		pinned: {
			crossSite: everIdOff,
			headerless: everIdOff,
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: everIdOffNote
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/confirm',
		file: 'auth/ever-id/confirm/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file; 404 while Ever ID is off (:69-70)',
		pinned: {
			crossSite: everIdOff,
			headerless: everIdOff,
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: everIdOffNote
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/finish-setup',
		file: 'auth/ever-id/finish-setup/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file; 404 while Ever ID is off (:46-47)',
		pinned: {
			crossSite: everIdOff,
			headerless: everIdOff,
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: everIdOffNote
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/signup-handoff',
		file: 'auth/ever-id/signup-handoff/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file; 404 while Ever ID is off (:93-94)',
		pinned: {
			crossSite: everIdOff,
			headerless: everIdOff,
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: everIdOffNote
	},
	{
		verb: 'POST',
		path: '/api/auth/ever-id/start',
		file: 'auth/ever-id/start/route.ts',
		evidence:
			'no origin guard; with the switch off (the default) its own table says 404, nothing called (route.ts:30-33)',
		body: {},
		pinned: {
			crossSite: everIdOff,
			headerless: everIdOff,
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: everIdOffNote
	},
	{
		verb: 'PUT',
		path: '/api/auth/ever-id/start',
		file: 'auth/ever-id/start/route.ts',
		evidence: 'exported verb of the same file; "any other method → 404, nothing called" (route.ts:32)',
		body: {},
		pinned: {
			crossSite: everIdOff,
			headerless: everIdOff,
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: everIdOffNote
	},
	{
		verb: 'PATCH',
		path: '/api/auth/ever-id/start',
		file: 'auth/ever-id/start/route.ts',
		evidence: 'exported verb of the same file',
		body: {},
		pinned: {
			crossSite: everIdOff,
			headerless: everIdOff,
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: everIdOffNote
	},
	{
		verb: 'DELETE',
		path: '/api/auth/ever-id/start',
		file: 'auth/ever-id/start/route.ts',
		evidence: 'exported verb of the same file',
		body: {},
		pinned: {
			crossSite: everIdOff,
			headerless: everIdOff,
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: everIdOffNote
	},
	{
		verb: 'POST',
		path: '/api/auth/finish-setup',
		file: 'auth/finish-setup/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file',
		pinned: {
			crossSite: { status: 400, body: '{"reason":"invalid"}' },
			headerless: { status: 400, body: '{"reason":"invalid"}' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: '400 of route.ts:26-28: the probe body carried no email/token, so this row reads as "not guarded", not as "reached the API"'
	},
	{
		verb: 'POST',
		path: '/api/auth/login',
		file: 'auth/login/route.ts',
		evidence:
			'no origin or sec-fetch read; the handler writes session cookies ' +
			'(AUDIT.md finding 1 names this family)',
		body: { email: PROBE_EMAIL },
		pinned: {
			crossSite: { status: 500, body: '' },
			headerless: { status: 500, body: '' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note:
			"500 with an empty body and no content-type, the mock asked nothing, and the lane's " +
			'`next-development.log` carried no line for it: the handler died before any upstream call. Not an origin ' +
			'reading — a crash on a body that names no code/token'
	},
	{
		verb: 'POST',
		path: '/api/auth/refresh',
		file: 'auth/refresh/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file',
		pinned: {
			crossSite: {
				status: 400,
				body: '{"errors":{"refresh_token":"The refresh token must be provided on the request body"}}'
			},
			headerless: {
				status: 400,
				body: '{"errors":{"refresh_token":"The refresh token must be provided on the request body"}}'
			},
			crossSiteCalls: 0,
			headerlessCalls: 0
		}
	},
	{
		verb: 'POST',
		path: '/api/auth/register',
		file: 'auth/register/route.ts',
		evidence: 'no origin or sec-fetch read; its e-mail link is built from the request URL (route.ts:31)',
		body: { email: PROBE_EMAIL },
		pinned: {
			crossSite: { status: 500, body: '' },
			headerless: { status: 500, body: '' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: '500 with an empty body, mock asked nothing — the same crash shape as /api/auth/login above'
	},
	{
		verb: 'POST',
		path: '/api/auth/request-password',
		file: 'auth/request-password/route.ts',
		evidence:
			'no origin guard; the reset link comes from the configured origin, never from the request ' +
			'(route.ts:16-21, appPublicOrigin at core/services/server/requests/account-deletion.ts:75)',
		pinned: {
			crossSite: { status: 400, body: emailFormatErrors },
			headerless: { status: 400, body: emailFormatErrors },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: `the probe email (${PROBE_EMAIL}) is refused by the app's own address validation, so nothing was forwarded`
	},
	{
		verb: 'POST',
		path: '/api/auth/reset-password',
		file: 'auth/reset-password/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file',
		pinned: {
			crossSite: { status: 400, body: '{"message":"Token and password are required"}' },
			headerless: { status: 400, body: '{"message":"Token and password are required"}' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		}
	},
	{
		verb: 'POST',
		path: '/api/auth/send-code',
		file: 'auth/send-code/route.ts',
		evidence: 'no origin guard; its callbackUrl is the request URL, not the Origin header (route.ts:8)',
		pinned: {
			crossSite: { status: 200, body: emailFormatErrors },
			headerless: { status: 200, body: emailFormatErrors },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note:
			'200 with the field errors in its body: the refusal is a body, not a status, so a client checking only ' +
			'response.ok would call this a success. Recorded, not asserted as a defect (malformed-json.spec.ts ' +
			'pins the same shape for /api/task-statuses)'
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-email',
		file: 'auth/signin-email/route.ts',
		evidence: 'no origin guard; the sign-in link is built from the configured origin (route.ts:8-13)',
		pinned: {
			crossSite: { status: 400, body: emailFormatErrors },
			headerless: { status: 400, body: emailFormatErrors },
			crossSiteCalls: 0,
			headerlessCalls: 0
		}
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-email-confirm',
		file: 'auth/signin-email-confirm/route.ts',
		evidence: 'no origin or sec-fetch read; the handler opens a session',
		pinned: {
			crossSite: { status: 500, body: '' },
			headerless: { status: 500, body: '' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: '500 with an empty body, mock asked nothing — the same crash shape as /api/auth/login'
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-email-password',
		file: 'auth/signin-email-password/route.ts',
		evidence: 'no origin or sec-fetch read; the handler opens a session',
		pinned: {
			crossSite: {
				status: 400,
				body: '{"errors":{"email":"Please make sure to fill out this field","password":"Please make sure to fill out this field"}}'
			},
			headerless: {
				status: 400,
				body: '{"errors":{"email":"Please make sure to fill out this field","password":"Please make sure to fill out this field"}}'
			},
			crossSiteCalls: 0,
			headerlessCalls: 0
		}
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-email-social-login',
		file: 'auth/signin-email-social-login/route.ts',
		evidence:
			':6-11 forwards `body.provider` and `body.access_token` through signWithSocialLoginsRequest ' +
			'(core/services/server/requests/auth.ts:71-78), which passes no bearer_token',
		pinned: {
			crossSite: { status: 200, body: '{"includeTeams":true}' },
			headerless: { status: 200, body: '{"includeTeams":true}' },
			crossSiteCalls: 1,
			headerlessCalls: 1
		},
		upstream: '/api/auth/signin.email.social',
		note: 'forwarded, with no bearer (see the named case below, which sends a token and shows where it goes)'
	},
	{
		verb: 'POST',
		path: '/api/auth/signin-workspace',
		file: 'auth/signin-workspace/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file (its handler sits in ../_signin-workspace)',
		pinned: {
			crossSite: { status: 400, body: emailFormatErrors },
			headerless: { status: 400, body: emailFormatErrors },
			crossSiteCalls: 0,
			headerlessCalls: 0
		}
	},
	{
		verb: 'POST',
		path: '/api/auth/two-factor/verify',
		file: 'auth/two-factor/verify/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file',
		pinned: {
			crossSite: { status: 400, body: '{"message":"challenge and code or recoveryCode are required"}' },
			headerless: { status: 400, body: '{"message":"challenge and code or recoveryCode are required"}' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		}
	},
	{
		verb: 'POST',
		path: '/api/auth/verify/token',
		file: 'auth/verify/token/route.ts',
		evidence: 'no origin or sec-fetch read anywhere in the file',
		pinned: {
			crossSite: { status: 200, body: emailFormatErrors },
			headerless: { status: 200, body: emailFormatErrors },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: '200 with the field errors in its body, as /api/auth/send-code above'
	},
	{
		verb: 'POST',
		path: '/api/auth/[...nextauth]',
		file: 'auth/[...nextauth]/route.ts',
		evidence:
			'no origin or sec-fetch read anywhere in the file; it hands the request to Auth.js ' +
			'(route.ts:22-23, `handlers.POST`)',
		pinned: {
			crossSite: { status: 400, body: '"Bad request."' },
			headerless: { status: 400, body: '"Bad request."' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note:
			"the answer is Auth.js's (`@auth/core` UnknownAction, logged by the lane's dev server as " +
			'"Cannot parse action at /api/auth/[...nextauth]"), not this app\'s; whatever origin check exists here is ' +
			"Auth.js's own and this lane cannot tell which answer it would give on a real sign-in action"
	},
	{
		verb: 'POST',
		path: '/api/auth/_signin-workspace',
		file: 'auth/_signin-workspace/route.ts',
		evidence:
			'no origin or sec-fetch read; it is the handler of POST /api/auth/signin-workspace ' +
			'(app/api/auth/signin-workspace/route.ts:2 re-exports this POST)',
		pinned: {
			crossSite: { status: 400, body: '"Bad request."' },
			headerless: { status: 400, body: '"Bad request."' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note:
			'FINDING ABOUT THE LIST: this is not a route. `_signin-workspace` is a private App-Router folder, so Next ' +
			"never routes /api/auth/_signin-workspace and Auth.js's catch-all answers it instead (the lane's dev log " +
			'printed "UnknownAction: Cannot parse action at /api/auth/_signin-workspace" for this probe). `find ' +
			'apps/web/app/api -name route.ts` and the collector both count it as a handler. The handler itself is ' +
			'reached, and probed, at POST /api/auth/signin-workspace'
	},
	{
		verb: 'POST',
		path: '/api/invite/accept',
		file: 'invite/accept/route.ts',
		evidence:
			':29-38 checks only the media type and that the body is a JSON object; :51-53 then hands the ' +
			'caller Origin to the API as the origin its welcome links are built on (appOriginOf at :188-194)',
		body: { email: PROBE_EMAIL, code: 'lane-c-probe-code' },
		upstream: '/api/invite/accept',
		pinned: {
			crossSite: { status: 400, body: '{"error":"Untrusted synthetic browser origin."}' },
			headerless: { status: 502, body: '{"statusCode":502,"message":"The Gauzy API gave no usable answer"}' },
			// 0 for the cross-site probe because the mock's origin refusal returns before its own request log is
			// written (`mock-gauzy-server.mjs:979-981` vs `:1041`); the app's answer body is the proof it got there.
			crossSiteCalls: 0,
			headerlessCalls: 1
		},
		differs:
			"the two answers differ, and not because this app reads a header: it forwards the caller's Origin " +
			"upstream (invite.ts:192-206) and the mock refused it — the 400 body is the mock's own text, which " +
			'appears nowhere in app/ or core/ — while the probe that sent no Origin got the fallback origin ' +
			"(this app's own), was accepted by the mock, and then died on the mock's echoed body. See the file " +
			'header, finding 2'
	},
	{
		verb: 'POST',
		path: '/api/invite/validate-by-code',
		file: 'invite/validate-by-code/route.ts',
		evidence: ':7-18 validates the code and email fields only, then verifyInviteCodeRequest',
		body: { email: PROBE_EMAIL, code: 'lane-c-probe-code' },
		upstream: '/api/invite/validate-by-code',
		pinned: {
			crossSite: { status: 200, body: `{"email":"${PROBE_EMAIL}","code":"lane-c-probe-code"}` },
			headerless: { status: 200, body: `{"email":"${PROBE_EMAIL}","code":"lane-c-probe-code"}` },
			crossSiteCalls: 1,
			headerlessCalls: 1
		}
	},
	{
		verb: 'POST',
		path: '/api/log',
		file: 'log/route.ts',
		evidence: ':6-44 reads the body and writes it to a log file; nothing asks where the request came from',
		pinned: {
			crossSite: { status: 201, body: '{"success":true}' },
			headerless: { status: 201, body: '{"success":true}' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note: "the write landed in this server's log file, which is why the mock log is empty here"
	},
	{
		verb: 'POST',
		path: '/api/organization-team-join',
		file: 'organization-team-join/route.ts',
		evidence:
			':19-24 forwards the body with no session and no guard, while the GET ten lines above runs ' +
			'authenticatedGuard (:6-8)',
		upstream: '/api/organization-team-join',
		pinned: {
			crossSite: { status: 200, body: '{"items":[],"total":0}' },
			headerless: { status: 200, body: '{"items":[],"total":0}' },
			crossSiteCalls: 1,
			headerlessCalls: 1
		}
	},
	{
		verb: 'POST',
		path: '/api/organization-team-join/resend-code',
		file: 'organization-team-join/resend-code/route.ts',
		evidence: ':5-10 forwards the body',
		upstream: '/api/organization-team-join/resend-code',
		pinned: {
			crossSite: { status: 200, body: '{}' },
			headerless: { status: 200, body: '{}' },
			crossSiteCalls: 1,
			headerlessCalls: 1
		}
	},
	{
		verb: 'POST',
		path: '/api/organization-team-join/validate',
		file: 'organization-team-join/validate/route.ts',
		evidence: ':5-10 forwards the body',
		upstream: '/api/organization-team-join/validate',
		pinned: {
			crossSite: { status: 200, body: '{}' },
			headerless: { status: 200, body: '{}' },
			crossSiteCalls: 1,
			headerlessCalls: 1
		}
	},
	{
		verb: 'POST',
		path: `/api/public/invoice-payments/invoice/${INVOICE_ID}/${INVOICE_TOKEN}/checkout`,
		file: 'public/invoice-payments/invoice/[id]/[token]/checkout/route.ts',
		evidence:
			'no origin guard on the request; the body check is origin-dependent ' +
			'(core/services/server/public-invoice-proxy.ts:62-78)',
		pinned: {
			crossSite: { status: 400, body: '{"message":"Invalid return address"}' },
			headerless: { status: 400, body: '{"message":"Invalid return address"}' },
			crossSiteCalls: 0,
			headerlessCalls: 0
		},
		note:
			'with no returnUrl in the body at all, this row is the shape check refusing, not the origin check; the ' +
			'origin half of the same route is pinned in the named cases below'
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
			// Reset between the two probes, so each one's mock log and bearer record is its own and no assertion has
			// to read a log two calls mixed together.
			await mockReset();
			const crossSite = await probe(api, probeSpec, {
				origin: FOREIGN_ORIGIN,
				'sec-fetch-site': 'cross-site'
			});
			const crossSiteLog = callsOf(await mock.requests(), probeSpec.upstream ?? '');
			await mockReset();
			const headerless = await probe(api, probeSpec, {});
			const headerlessLog = callsOf(await mock.requests(), probeSpec.upstream ?? '');

			const { pinned } = probeSpec;
			/** Carried by every failure message, so a future red prints today's answer instead of hiding it. */
			const witness =
				`${probeSpec.verb} ${probeSpec.path} (${probeSpec.file} — ${probeSpec.evidence}) · ` +
				`cross-site: ${crossSite.status} ${crossSite.text.slice(0, 240)} · ` +
				`no Origin/no Sec-Fetch-Site: ${headerless.status} ${headerless.text.slice(0, 240)} · ` +
				`mock calls to ${probeSpec.upstream ?? 'this route'}: ${JSON.stringify(crossSiteLog)} / ` +
				`${JSON.stringify(headerlessLog)}` +
				(probeSpec.note ? ` · limit: ${probeSpec.note}` : '');

			expect(
				isGuardRefusal(crossSite.status, crossSite.text),
				`${witness} — this handler answered with the shared origin guard's refusal, so it is guarded and ` +
					'must be moved out of this list (that is a finding about the list, not about a fix)'
			).toBe(false);

			// The pinned answers, exactly as the 2026-11-21 run printed them.
			expect(crossSite.status, `${witness} — the cross-site status moved`).toBe(pinned.crossSite.status);
			expect(crossSite.text, `${witness} — the cross-site body moved`).toBe(pinned.crossSite.body);
			expect(headerless.status, `${witness} — the headerless status moved`).toBe(pinned.headerless.status);
			expect(headerless.text, `${witness} — the headerless body moved`).toBe(pinned.headerless.body);

			// Was the API asked, per probe and for this route's own upstream path only. An empty list proves nothing
			// on its own (file header, "The rule…"); read it beside the two answers above.
			expect(crossSiteLog.length, `${witness} — the cross-site probe's upstream calls changed`).toBe(
				pinned.crossSiteCalls
			);
			expect(headerlessLog.length, `${witness} — the headerless probe's upstream calls changed`).toBe(
				pinned.headerlessCalls
			);

			if (probeSpec.differs) {
				expect(
					headerless.status,
					`${witness} — this row is pinned as *differing*: ${probeSpec.differs}`
				).not.toBe(crossSite.status);
			} else {
				expect(
					headerless.status,
					`${witness} — a client that reports nothing was answered differently from a browser that reports ` +
						'cross-site, so some code here does read one of those headers'
				).toBe(crossSite.status);
			}
		});
	}
});

test.describe('the same handlers, checked against what would prove a guard exists', () => {
	/**
	 * The control that makes every case above mean something: these exact headers do trigger the guard where one is
	 * installed. `POST /api/chat/conversations` reaches it through `forwardToGauzy`
	 * (`core/services/server/forward-to-gauzy.ts:89-90`), which answers before any upstream call
	 * (`same-origin-request.ts:48-53`). Measured: 403 with the guard's own body, and an empty mock log — the refusal
	 * is produced here, and this route's refusal does log nothing.
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
		expect(text, `the refusal did not carry the guard's own body (${text})`).toBe(GUARD_BODY);
		expect(await mock.requests(), 'a refusal made here still asked the API').toEqual([]);
	});

	/**
	 * `POST /api/organization-team-join` is the sharpest one in `AUDIT.md` finding 1: no origin guard and no
	 * session either. `requestToJoinRequest` (`core/services/server/requests/request-to-join-team.ts:14-19`) passes
	 * no `bearer_token`, and `serverFetch` writes no `authorization` header without one
	 * (`core/services/server/fetch.ts:91-93`).
	 *
	 * Measured, both halves, anonymous and signed-in: the cross-site write was forwarded
	 * (`POST /api/organization-team-join 200` in the mock's log, the app answering 200 `{"items":[],"total":0}`) and
	 * it carried no credential — `receivedTokens` is empty for the anonymous probe and empty for the probe that
	 * carried this lane's session cookies too. What the API would have done with an unauthenticated write is not
	 * answerable here: the mock answers every path and never validates a bearer (`mock-gauzy-server.mjs:1052-1058`
	 * records a bearer's sha256 and nothing else), and the `{"items":[],"total":0}` in the body is the mock's own
	 * canned answer for this exact path (`mock-gauzy-server.mjs:790`), not a team list this app produced.
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
		expect(crossSite.status, `the forwarded write's answer moved (${crossSite.text})`).toBe(200);
		expect(crossSite.text, `the forwarded write's body moved (${crossSite.status})`).toBe('{"items":[],"total":0}');
		expect(
			calls.length,
			`the write was not forwarded to the API either: ${crossSite.status} ${crossSite.text}`
		).toBe(1);
		expect(
			tokens,
			`the forwarded write carried a bearer after all: ${JSON.stringify(tokens)} (upstream path is ` +
				"'organization-team-join, appended to GAUZY_API_SERVER_URL at core/services/server/fetch.ts:110)"
		).toEqual([]);

		// The same route with this lane's session cookies: still no bearer on the forwarded write, because the
		// request helper never names one (request-to-join-team.ts:14-19).
		await mockReset();
		const signedIn = await probe(api, probeSpec, { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' });
		const signedInCalls = await mock.calls('/api/organization-team-join');
		const signedInTokens = await receivedTokens('/api/organization-team-join');
		expect(signedInCalls.length, `the signed-in cross-site write stopped being forwarded: ${signedIn.status}`).toBe(
			1
		);
		expect(
			signedInTokens,
			`a signed-in cross-site write started carrying a bearer: ${JSON.stringify(signedInTokens)}`
		).toEqual([]);
	});

	/**
	 * `POST /api/auth/signin-email-social-login` forwards a cross-site write, and the caller's own token goes with
	 * it — in the body, not as a credential. Measured: `{"provider":"GOOGLE","access_token":"lane-c-caller-token"}`
	 * answered 200 with `{"provider":"GOOGLE","token":"lane-c-caller-token","includeTeams":true}`, because the mock
	 * echoes the body it was sent (`mock-gauzy-server.mjs:792-794`), so the echo is the record of what left this app:
	 * `signWithSocialLoginsRequest` puts it in `body.token` (`core/services/server/requests/auth.ts:71-78`) and names
	 * no `bearer_token`, which is why `receivedTokens` stays empty. Whether Gauzy would accept that token as a social
	 * sign-in is not answerable in this harness.
	 */
	test('POST /api/auth/signin-email-social-login forwards the caller-supplied token inside the body', async ({
		api,
		mock
	}) => {
		const response = await api('/api/auth/signin-email-social-login', {
			method: 'POST',
			anonymous: true,
			body: { provider: 'GOOGLE', access_token: 'lane-c-caller-token' },
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const text = await response.text();
		const calls = callsOf(await mock.requests(), '/api/auth/signin.email.social');
		const tokens = await receivedTokens('/api/auth/signin.email.social');

		expect(response.status(), `the social-login write was not forwarded as measured (${text})`).toBe(200);
		expect(text, `what travelled upstream changed (${response.status()})`).toBe(
			'{"provider":"GOOGLE","token":"lane-c-caller-token","includeTeams":true}'
		);
		expect(calls, `the mock did not record the forwarded call: ${JSON.stringify(calls)}`).toEqual([
			'POST /api/auth/signin.email.social 200'
		]);
		expect(tokens, `the forwarded write now carries a bearer: ${JSON.stringify(tokens)}`).toEqual([]);
	});

	/**
	 * The invoice checkout's guard is on a *body value* and it only binds a browser: `isPaymentReturnUrl` passes
	 * when the request carried no Origin at all (`!origin || url.origin === origin`,
	 * `core/lib/utils/shared-invoice.ts:106-118`, used at `core/services/server/public-invoice-proxy.ts:62-78`).
	 * The three statuses below are the ones the 2026-11-21 run printed.
	 */
	const checkout: Probe = UNGUARDED_WRITES.find((candidate) => candidate.path.endsWith('/checkout')) as Probe;
	const foreignReturn = `${FOREIGN_ORIGIN}/shared-invoice?paid=1`;
	const ownReturn = `${APP_ORIGIN}/shared-invoice?paid=1`;
	const checkoutEcho = `{"returnUrl":"${foreignReturn}"}`;
	const checkoutUpstream = `/api/public/invoice-payments/invoice/${INVOICE_ID}/${INVOICE_TOKEN}/checkout`;

	test('checkout: a foreign Origin whose returnUrl matches it is forwarded, 200', async ({ api, mock }) => {
		const response = await api(checkout.path, {
			method: 'POST',
			anonymous: true,
			body: { returnUrl: foreignReturn },
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const text = await response.text();
		const calls = callsOf(await mock.requests(), checkoutUpstream);

		expect(
			isGuardRefusal(response.status(), text),
			`the checkout refused as the shared guard does (${response.status()} ${text}) — it does not use it`
		).toBe(false);
		expect(response.status(), `the matched checkout no longer answers 200 (${text})`).toBe(200);
		expect(text, `the forwarded checkout body moved (${response.status()})`).toBe(checkoutEcho);
		expect(calls, `the checkout call the mock recorded changed: ${JSON.stringify(calls)}`).toEqual([
			`POST ${checkoutUpstream} 200`
		]);
	});

	/**
	 * The case the origin rule actually leaves open: `isPaymentReturnUrl` compares against the request's Origin only
	 * when there is one, so a client that sends no `Origin` may name any host as the address the payment provider
	 * sends the payer back to. Measured: forwarded, 200, the foreign returnUrl handed upstream verbatim.
	 */
	test('checkout: a client with no Origin may name any host as the returnUrl', async ({ api, mock }) => {
		const response = await api(checkout.path, {
			method: 'POST',
			anonymous: true,
			body: { returnUrl: foreignReturn }
		});
		const text = await response.text();
		const calls = callsOf(await mock.requests(), checkoutUpstream);

		expect(response.status(), `the headerless checkout no longer answers 200 (${response.status()} ${text})`).toBe(
			200
		);
		expect(text, `the forwarded returnUrl is no longer the caller's own text (${response.status()})`).toBe(
			checkoutEcho
		);
		expect(
			calls.length,
			`the headerless client was stopped by the return-address check (status ${response.status()} ${text}) — ` +
				'which would mean isPaymentReturnUrl does not pass an absent Origin, as core/lib/utils/' +
				'shared-invoice.ts:118 reads'
		).toBe(1);
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
		expect(text, `the 400 did not say why (${response.status()})`).toBe('{"message":"Invalid return address"}');
		expect(await mock.requests(), 'the refusal came after the API was asked').toEqual([]);
	});
});

test.describe('unguarded in the collector vocabulary, origin-guarded by other means', () => {
	/**
	 * `POST /api/account-deletion/me` — the first run's finding 1: guarded by a helper the collector's vocabulary
	 * does not know, through a file the per-file scan never opened. `refuseUntrustedPost`
	 * (`core/services/server/requests/account-deletion-me.ts:33-53`) refuses `Sec-Fetch-Site: cross-site` and a
	 * foreign `Origin` with `{ message }` — its own body, no `statusCode`, and `Cache-Control: no-store` (`:18-22`),
	 * unlike the shared guard's `{statusCode, message}` (`same-origin-request.ts:49-52`).
	 *
	 * Measured, and the half worth keeping: a caller that reports nothing and sends `confirm: true` is not refused as
	 * cross-site at all — it reaches the deletion.
	 */
	test('POST /api/account-deletion/me refuses a cross-site write, and a headerless one that confirms is forwarded', async ({
		api,
		mock
	}) => {
		const crossSite = await api('/api/account-deletion/me', {
			method: 'POST',
			body: {},
			anonymous: true,
			headers: { origin: FOREIGN_ORIGIN, 'sec-fetch-site': 'cross-site' }
		});
		const crossSiteText = await crossSite.text();
		const crossSiteLog = triples(await mock.requests());

		expect(
			crossSite.status(),
			`the account-deletion POST guard stopped refusing a cross-site write (${crossSiteText})`
		).toBe(403);
		expect(
			crossSiteText,
			`the refusal is no longer this guard's own body — it answers with the shared guard's now, which means ` +
				`the route started using refuseForeignOrigin (${crossSite.status()} ${crossSiteText})`
		).toBe('{"message":"Cross-site request refused"}');
		expect(crossSiteLog, `a refusal made here still asked the API: ${JSON.stringify(crossSiteLog)}`).toEqual([]);

		// The body check that follows the origin check, with no Origin and no Sec-Fetch-Site at all.
		await mockReset();
		const unconfirmed = await api('/api/account-deletion/me', {
			method: 'POST',
			body: {},
			anonymous: true
		});
		const unconfirmedText = await unconfirmed.text();
		expect(unconfirmed.status(), `the confirm check moved (${unconfirmedText})`).toBe(400);
		expect(unconfirmedText, `the confirm refusal changed (${unconfirmed.status()})`).toBe(
			'{"message":"confirm must be true"}'
		);
		expect(
			await mock.requests(),
			`the confirm refusal asked the API anyway: ${JSON.stringify(await mock.requests())}`
		).toEqual([]);

		// A headerless caller that does confirm: forwarded, with a bearer recorded against the deletion call.
		await mockReset();
		const confirmed = await api('/api/account-deletion/me', {
			method: 'POST',
			body: { confirm: true },
			anonymous: true
		});
		const confirmedText = await confirmed.text();
		const deletionCalls = callsOf(await mock.requests(), '/api/account-deletion/me');
		expect(
			confirmed.status(),
			`a caller that named no Origin and confirmed was refused — the guard would then cover a headerless form ` +
				`post too (${confirmed.status()} ${confirmedText})`
		).toBe(200);
		expect(confirmedText, `the forwarded deletion body moved (${confirmed.status()})`).toBe('{"confirm":true}');
		expect(deletionCalls, `the deletion was not forwarded: ${JSON.stringify(deletionCalls)}`).toEqual([
			'POST /api/account-deletion/me 200'
		]);
	});

	/**
	 * `POST /api/board/notify` (`app/api/board/notify/route.ts:37-41`) refuses any Origin that is not exactly the
	 * configured Board origin — including none — with `{ message: 'Forbidden' }`
	 * (`core/services/server/board-cors.ts:26-28`, `isTrustedBoardOrigin` at `core/lib/board/board-app.ts:81-87`).
	 * That is stricter than the shared guard, which lets a headerless client through
	 * (`session-guard.spec.ts`'s "a client that sends neither Origin nor Sec-Fetch-Site passes the write guard").
	 * It is in `audit-evidence.md` §E's list only because the collector's vocabulary
	 * (`collect-foreign-origin-routes.mjs:31,37`) knows no third origin guard. Measured: both probes answered 403
	 * with that exact body, and the mock was asked nothing.
	 */
	test('POST /api/board/notify refuses a foreign Origin, and a missing one, with its own body', async ({
		api,
		mock
	}) => {
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

		expect(foreign.status(), `the Board origin allowlist did not refuse a foreign Origin (${foreignText})`).toBe(
			403
		);
		expect(
			foreignText,
			`the refusal carried the shared guard's body instead of the Board's (${foreign.status()} ${foreignText})`
		).toBe('{"message":"Forbidden"}');
		expect(none.status(), `a client that sent no Origin passed the Board allowlist (${noneText})`).toBe(403);
		expect(noneText, `the headerless refusal carried a different body (${none.status()})`).toBe(
			'{"message":"Forbidden"}'
		);
		expect(await mock.requests(), 'either refusal asked the API anyway').toEqual([]);
	});

	/**
	 * The two aliases: the guard lives in the file whose handler they import, so a per-file scan (mine, and the
	 * collector's) credits them nothing while the request is refused before anything is read. Measured: both
	 * answered the shared guard's 403 with its own body, and the mock was asked nothing.
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
				text,
				`${alias.probe} answered with a different body than the shared guard's (${response.status()} ${text})`
			).toBe(GUARD_BODY);
			expect(await mock.requests(), `${alias.probe} asked the API before refusing`).toEqual([]);
		});
	}
});

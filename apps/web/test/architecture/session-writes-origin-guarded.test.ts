/**
 * Every write handler (POST, PUT, PATCH, DELETE) under app/api must keep another site's page out: a page of a sibling
 * subdomain, or of any site when the cookies are SameSite=None, can make the browser attach the session's cookies to a
 * form or a bodiless post. A handler either
 *
 * - calls `refuseForeignOrigin` itself (#5376, #5381),
 * - hands the request on through forwardToGauzy, or refuseUnlessPermitted / refuseWithoutPermission first, which
 *   refuse a foreign write themselves (forwarded-writes-origin.test.ts checks each route),
 * - or is listed below with the reason it takes requests no app session is borrowed for.
 *
 * A new write route that does none of these fails here.
 */
import { callsRefuseForeignOrigin, forwardsThroughProxyHelper, writeHandlers } from '@/test/api/write-handlers';

/** The write handlers that take a request of any origin, and why that borrows no session of this app. */
const NOT_ORIGIN_CHECKED: Record<string, string> = {
	'account-deletion/confirm POST': 'no session: the deletion token comes in the body',
	'account-deletion/me POST': 'its own same-origin and JSON-only check (account-deletion-me.ts)',
	'account-deletion/request POST': 'no session: the e-mail comes in the body',
	'account-deletion/verify POST': 'no session: the deletion token comes in the body',
	'auth/_signin-workspace POST': 'sign-in: no session yet',
	'auth/ever-id/backchannel-logout POST': 'a server-to-server call of the identity provider',
	'auth/ever-id/confirm POST': "Ever ID sign-in: its sealed hand-off cookie, not this app's session",
	'auth/ever-id/finish-setup POST': "Ever ID sign-in: its own sign-in session, not this app's",
	'auth/ever-id/signup-handoff POST': "Ever ID sign-up: its sealed hand-off cookie, not this app's session",
	'auth/finish-setup POST': 'sign-up: the workspace token comes in the body',
	'auth/login POST': 'sign-in: no session yet',
	'auth/refresh POST': 'the refresh token comes in the body, not from a cookie',
	'auth/register POST': 'sign-up: no session yet',
	'auth/request-password POST': 'password recovery: no session',
	'auth/reset-password POST': 'password recovery: no session',
	'auth/send-code POST': 'sign-in: no session yet',
	'auth/signin-email POST': 'sign-in: no session yet',
	'auth/signin-email-confirm POST': 'sign-in: no session yet',
	'auth/signin-email-password POST': 'sign-in: no session yet',
	'auth/signin-email-social-login POST': 'sign-in: no session yet',
	'auth/signin-workspace POST': 'the public path of auth/_signin-workspace (sign-in: no session yet)',
	'auth/two-factor/verify POST': 'sign-in: the two-factor challenge comes in the body',
	'auth/verify/token POST': 'e-mail link: the token comes in the body',
	'board/notify POST': "the Board's exact origin (board-cors), which refuseForeignOrigin would refuse",
	'daily-plan/[id]/task POST': 'delegates to daily-plan/plan/[planId], which calls refuseForeignOrigin',
	'daily-plan/[id]/task PUT': 'delegates to daily-plan/plan/[planId], which calls refuseForeignOrigin',
	'invite/accept POST': 'invitation: the invite code comes in the body, and it signs in',
	'invite/validate-by-code POST': 'invitation: the code comes in the body',
	'log POST': 'development-only log sink: no session',
	'organization-team-join POST': 'join request by e-mail: no session',
	'organization-team-join/resend-code POST': 'join request: the e-mail comes in the body',
	'organization-team-join/validate POST': 'join request: the code comes in the body',
	'public/invoice-payments/invoice/[id]/[token]/checkout POST': 'public route: the payment link token, no session',
	'timer/toogle POST': 'the old path of timer/toggle, whose handler it calls and which calls refuseForeignOrigin'
};

const handlers = writeHandlers();
const key = ({ route, method }: { route: string; method: string }) => `${route} ${method}`;

describe('app/api write handlers keep another site out', () => {
	it('reads the write handlers of app/api', () => {
		expect(handlers.length).toBeGreaterThan(250);
	});

	it('check the origin, forward through a helper that does, or are listed with a reason', () => {
		const unchecked = handlers
			.filter((handler) => !callsRefuseForeignOrigin(handler) && !forwardsThroughProxyHelper(handler))
			.map(key)
			.filter((handler) => !(handler in NOT_ORIGIN_CHECKED));

		expect(unchecked).toEqual([]);
	});

	it('list only handlers that exist and still check nothing', () => {
		const unchecked = new Set(
			handlers
				.filter((handler) => !callsRefuseForeignOrigin(handler) && !forwardsThroughProxyHelper(handler))
				.map(key)
		);

		expect(Object.keys(NOT_ORIGIN_CHECKED).filter((listed) => !unchecked.has(listed))).toEqual([]);
	});
});

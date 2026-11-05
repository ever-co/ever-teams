/**
 * Proxy-mode account deletion routes (app/api/account-deletion/{request,verify,confirm}): forward only the expected
 * fields to Gauzy, and answer with Gauzy's own status — the confirm page tells a dead link (410) from a failure.
 */
jest.mock('../client-ip', () => ({ clientIpHeaders: jest.fn(async () => ({ 'X-Ever-Client-IP': '203.0.113.7' })) }));

import { GAUZY_API_SERVER_URL } from '@/core/constants/config/constants';
import { appEmailBranding } from '@/core/lib/helpers/app-email-branding';
import { accountDeletionCallbackUrl, proxyAccountDeletion } from './account-deletion';

const fetchMock = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
	global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
	global.fetch = originalFetch;
});

function post(body: unknown, headers: Record<string, string> = {}, url = 'https://app.ever.team/api/account-deletion/x') {
	return new Request(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
}

const originalWebAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL;
afterEach(() => {
	if (originalWebAppUrl === undefined) delete process.env.NEXT_PUBLIC_WEB_APP_URL;
	else process.env.NEXT_PUBLIC_WEB_APP_URL = originalWebAppUrl;
});

function gauzyAnswers(status: number, body: unknown) {
	fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

function forwarded(): { url: string; init: RequestInit & { headers: Record<string, string> } } {
	const [url, init] = fetchMock.mock.calls[0];
	return { url, init };
}

describe('proxyAccountDeletion', () => {
	it('forwards a request with the e-mail and locale only, its link and branding built here, and the client IP headers', async () => {
		delete process.env.NEXT_PUBLIC_WEB_APP_URL;
		gauzyAnswers(202, { status: 'accepted' });

		const res = await proxyAccountDeletion(
			'request',
			post({
				email: ' jane@example.com ',
				callbackUrl: 'https://app.ever.team/delete-account/confirm',
				locale: 'fr',
				appName: 'Ever Teams',
				tenantId: 'not-forwarded',
				admin: true
			})
		);

		expect(res.status).toBe(202);
		expect(res.headers.get('cache-control')).toBe('no-store');
		await expect(res.json()).resolves.toEqual({ status: 'accepted' });
		const { url, init } = forwarded();
		expect(url).toBe(`${GAUZY_API_SERVER_URL}/account-deletion/request`);
		expect(init.method).toBe('POST');
		expect(init.headers['X-Ever-Client-IP']).toBe('203.0.113.7');
		expect(init.signal).toBeInstanceOf(AbortSignal);
		expect(JSON.parse(String(init.body))).toEqual({
			...appEmailBranding(),
			email: 'jane@example.com',
			callbackUrl: 'https://app.ever.team/fr/delete-account/confirm',
			locale: 'fr'
		});
	});

	it('never forwards a caller-supplied confirmation link or branding link (the e-mailed token must stay on this app)', async () => {
		delete process.env.NEXT_PUBLIC_WEB_APP_URL;
		gauzyAnswers(202, { status: 'accepted' });

		await proxyAccountDeletion(
			'request',
			post(
				{
					email: 'victim@example.com',
					callbackUrl: 'https://attacker.example/steal',
					appLink: 'https://attacker.example',
					companyLink: 'https://attacker.example',
					appLogo: 'https://attacker.example/logo.png',
					appName: 'Not this app'
				},
				// Any client can set Origin: it never decides the link
				{ origin: 'https://attacker.example' }
			)
		);

		const body = JSON.parse(String(forwarded().init.body));
		expect(body.callbackUrl).toBe('https://app.ever.team/delete-account/confirm');
		expect(JSON.stringify(body)).not.toContain('attacker.example');
		expect(body.appName).toBe(appEmailBranding().appName);
	});

	it('builds the link on the configured public origin (NEXT_PUBLIC_WEB_APP_URL) before the request host', () => {
		process.env.NEXT_PUBLIC_WEB_APP_URL = 'https://teams.example.com/';

		expect(accountDeletionCallbackUrl(post({}, {}, 'http://internal:3030/api/account-deletion/request'), 'de')).toBe(
			'https://teams.example.com/de/delete-account/confirm'
		);
	});

	it('uses the protocol and host a TLS-terminating proxy reports, and the default locale for an unknown one', () => {
		delete process.env.NEXT_PUBLIC_WEB_APP_URL;
		const req = post(
			{},
			{ 'x-forwarded-proto': 'https, http', 'x-forwarded-host': 'teams.example.com' },
			'http://internal:3030/api/account-deletion/request'
		);

		expect(accountDeletionCallbackUrl(req, 'xx/../evil')).toBe('https://teams.example.com/delete-account/confirm');
		expect(accountDeletionCallbackUrl(req, 'en')).toBe('https://teams.example.com/delete-account/confirm');
	});

	it('passes the 410 of a dead link through, unchanged', async () => {
		const gone = { message: 'This link is invalid or has expired. Request a new one.' };
		gauzyAnswers(410, gone);

		const res = await proxyAccountDeletion('verify', post({ token: 'tok' }));

		expect(res.status).toBe(410);
		await expect(res.json()).resolves.toEqual(gone);
		expect(JSON.parse(String(forwarded().init.body))).toEqual({ token: 'tok' });
	});

	it('always sends confirm: true with the token and the planHash of the preview on confirm', async () => {
		gauzyAnswers(200, { deleted: true, accounts: 2, workspacesDeleted: 1 });

		const res = await proxyAccountDeletion('confirm', post({ token: 'tok', confirm: false, planHash: 'plan-1' }));

		expect(res.status).toBe(200);
		expect(JSON.parse(String(forwarded().init.body))).toEqual({ token: 'tok', planHash: 'plan-1', confirm: true });
	});

	it('passes the 409 of a changed preview through (nothing deleted)', async () => {
		gauzyAnswers(409, { message: 'The accounts changed since the preview.' });

		const res = await proxyAccountDeletion('confirm', post({ token: 'tok', planHash: 'old' }));

		expect(res.status).toBe(409);
	});

	it('answers 400 without calling Gauzy when the required field is missing', async () => {
		const res = await proxyAccountDeletion('confirm', post({ confirm: true }));

		expect(res.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refuses a confirm without the planHash of the preview the person saw', async () => {
		const res = await proxyAccountDeletion('confirm', post({ token: 'tok', confirm: true }));

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toEqual({ message: 'planHash is required' });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('answers 502 when Gauzy cannot be reached', async () => {
		fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

		const res = await proxyAccountDeletion('request', post({ email: 'jane@example.com' }));

		expect(res.status).toBe(502);
	});
});

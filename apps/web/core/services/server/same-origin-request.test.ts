/**
 * A proxy route that takes a multipart body acts with the session's cookies, which a form posted from another site
 * also carries: it must come from this app's own pages.
 */
import { refuseForeignOrigin } from './same-origin-request';

const request = (headers: Record<string, string>) =>
	new Request('https://teams.example.com/api/plugins/docs/imports', { method: 'POST', headers: { host: 'teams.example.com', ...headers } });

describe('refuseForeignOrigin', () => {
	it("lets this app's own pages through", () => {
		expect(refuseForeignOrigin(request({ origin: 'https://teams.example.com', 'sec-fetch-site': 'same-origin' }))).toBeNull();
		// A client that sends neither header (no browser) is left to the session check.
		expect(refuseForeignOrigin(request({}))).toBeNull();
	});

	it('refuses what the browser says comes from another site, a sibling subdomain included', async () => {
		const crossSite = refuseForeignOrigin(request({ 'sec-fetch-site': 'cross-site' }));
		expect(crossSite?.status).toBe(403);
		expect(refuseForeignOrigin(request({ 'sec-fetch-site': 'same-site' }))?.status).toBe(403);
		await expect(crossSite?.json()).resolves.toMatchObject({ statusCode: 403 });
	});

	it('refuses an Origin that is not this host, or not a URL', () => {
		expect(refuseForeignOrigin(request({ origin: 'https://evil.example.net' }))?.status).toBe(403);
		expect(refuseForeignOrigin(request({ origin: 'null' }))?.status).toBe(403);
	});

	it('compares the Origin with the host the proxy in front forwarded', () => {
		const behindProxy = request({ origin: 'https://teams.example.com', 'x-forwarded-host': 'teams.example.com, internal:3030', host: 'web:3030' });
		expect(refuseForeignOrigin(behindProxy)).toBeNull();
	});
});

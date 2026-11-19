/**
 * The rules of `/embed/authorize` (#5528): which query a site may open it with, where the tokens go, and how each
 * refusal of the API reads.
 */
import {
	EMBED_AUTHORIZED_MESSAGE,
	EMBED_DENIED_MESSAGE,
	embedAuthorizeRequestOf,
	embedSiteRefusalOf,
	handTokensToSite,
	isPlainOrigin,
	organizationOfRequest,
	siteWindowOf,
	tellSiteDenied
} from './embed-authorize';

const TOKENS = {
	token: 'header.claims.signature',
	expiresAt: '2026-11-19T10:15:00.000Z',
	renewalToken: 'gzr_renewal-token',
	renewalExpiresAt: '2026-12-19T10:00:00.000Z'
};

const STATE = '0123456789abcdef0123456789abcdef';
const REQUEST = { origin: 'https://team.example.com', organizationId: 'organization-1', state: STATE };

const queryOf = (search: string) => new URLSearchParams(search);

describe('isPlainOrigin', () => {
	it.each(['https://team.example.com', 'http://localhost:8080', 'https://team.example.com:8443'])(
		'takes %s, as a browser names it',
		(origin) => {
			expect(isPlainOrigin(origin)).toBe(true);
		}
	);

	it.each([
		'',
		'team.example.com',
		'https://team.example.com/',
		'https://team.example.com/page',
		'https://team.example.com?next=1',
		'https://team.example.com#top',
		'https://user@team.example.com',
		'https://*.example.com',
		'HTTPS://TEAM.EXAMPLE.COM',
		'javascript:alert(1)',
		'file:///home/page.html',
		'https://team.example.com:443'
	])('refuses %p', (origin) => {
		expect(isPlainOrigin(origin)).toBe(false);
	});
});

describe('embedAuthorizeRequestOf', () => {
	it("reads the site, the organization and the kit's state", () => {
		const query = queryOf(`origin=https%3A%2F%2Fteam.example.com&organization=organization-1&state=${STATE}`);

		expect(embedAuthorizeRequestOf(query)).toEqual(REQUEST);
	});

	it('refuses a query without a plain origin, without an organization or without a state', () => {
		const withState = (search: string) => queryOf(`${search}&state=${STATE}`);
		expect(embedAuthorizeRequestOf(withState('organization=organization-1'))).toBeNull();
		expect(
			embedAuthorizeRequestOf(withState('origin=https%3A%2F%2Fteam.example.com%2Fpath&organization=o'))
		).toBeNull();
		expect(embedAuthorizeRequestOf(withState('origin=https%3A%2F%2Fteam.example.com'))).toBeNull();
		expect(embedAuthorizeRequestOf(withState('origin=https%3A%2F%2Fteam.example.com&organization=%20'))).toBeNull();
	});

	it.each(['', 'short', `${STATE}%20`, `${STATE}%26x%3D1`, 'a'.repeat(129)])('refuses the state %p', (state) => {
		const query = queryOf(`origin=https%3A%2F%2Fteam.example.com&organization=organization-1&state=${state}`);

		expect(embedAuthorizeRequestOf(query)).toBeNull();
	});
});

describe('the messages to the site', () => {
	it("hands the tokens to the exact origin of the site, and nowhere else, with the kit's state", () => {
		const site = { postMessage: jest.fn(), closed: false } as unknown as Window;

		handTokensToSite(site, REQUEST, TOKENS);
		tellSiteDenied(site, REQUEST);

		expect(site.postMessage).toHaveBeenNthCalledWith(
			1,
			{ type: EMBED_AUTHORIZED_MESSAGE, state: STATE, ...TOKENS },
			'https://team.example.com'
		);
		expect(site.postMessage).toHaveBeenNthCalledWith(
			2,
			{ type: EMBED_DENIED_MESSAGE, state: STATE },
			'https://team.example.com'
		);
	});

	it('finds no site for a page opened in its own tab, or whose opener was closed', () => {
		const site = { closed: false } as Window;

		expect(siteWindowOf({ opener: site } as unknown as Window)).toBe(site);
		expect(siteWindowOf({ opener: null } as unknown as Window)).toBeNull();
		expect(siteWindowOf({ opener: { closed: true } } as unknown as Window)).toBeNull();
	});

	it('finds no site for a page shown in a frame, whatever opened the window around it', () => {
		const site = { closed: false } as Window;
		const page: { opener: Window; top: unknown } = { opener: site, top: null };

		page.top = page;
		expect(siteWindowOf(page as unknown as Window)).toBe(site);
		page.top = {};
		expect(siteWindowOf(page as unknown as Window)).toBeNull();
	});
});

describe('embedSiteRefusalOf', () => {
	const refusal = (code: string) => ({ statusCode: 403, errorCode: code });

	it('names each refusal of the API by its code', () => {
		expect(embedSiteRefusalOf(refusal('EMBED_ORIGIN_NOT_ALLOWED'))).toBe('site-not-allowed');
		expect(embedSiteRefusalOf(refusal('EMBED_SITE_SIGN_IN_OFF'))).toBe('sign-in-off');
		expect(embedSiteRefusalOf(refusal('EMBED_MEMBER_NOT_ALLOWED'))).toBe('member-not-allowed');
	});

	it('reads a server without the route as unavailable, and anything else as a failure', () => {
		expect(embedSiteRefusalOf({ statusCode: 404 })).toBe('unavailable');
		expect(embedSiteRefusalOf({ statusCode: 403, errorCode: 'toString' })).toBe('failed');
		expect(embedSiteRefusalOf({ statusCode: 500 })).toBe('failed');
		expect(embedSiteRefusalOf(new Error('Network Error'))).toBe('failed');
	});
});

describe('organizationOfRequest', () => {
	const organizations = {
		current: { id: 'organization-1', name: 'Northwind' },
		others: [{ id: 'organization-2', name: 'Fabrikam', teams: [], teamsListed: false }]
	};

	it("finds the organization among the person's, current or not", () => {
		expect(organizationOfRequest(organizations, 'organization-1')).toEqual({
			id: 'organization-1',
			name: 'Northwind'
		});
		expect(organizationOfRequest(organizations, 'organization-2')).toEqual({
			id: 'organization-2',
			name: 'Fabrikam'
		});
	});

	it('finds nothing for an organization the person is not a member of', () => {
		expect(organizationOfRequest(organizations, 'organization-3')).toBeNull();
	});
});

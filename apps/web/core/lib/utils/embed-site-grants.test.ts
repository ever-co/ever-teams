/**
 * The rules of "Sites you signed in from" (#5595): the order of the sites, how each is named, and how a 404 of the
 * API reads.
 */
import {
	isSiteGrantAlreadyEnded,
	isSiteGrantsUnavailable,
	renewalEndOf,
	siteGrantsInOrder,
	siteHostOf
} from './embed-site-grants';
import type { EmbedSiteGrant } from '@/core/types/schemas/embeds/embed.schema';

function grantOf(overrides: Partial<EmbedSiteGrant>): EmbedSiteGrant {
	return {
		id: 'grant-1',
		origin: 'https://team.example.com',
		expiresAt: '2026-12-20T09:00:00.000Z',
		...overrides
	};
}

function errorWith(status: number) {
	return {
		message: `Request failed with status code ${status}`,
		status,
		response: { data: { message: 'refused' }, headers: {}, status, statusText: '' }
	};
}

describe('siteGrantsInOrder', () => {
	it('lists first the site that can renew its sign-in the longest', () => {
		const sooner = grantOf({ id: 'sooner', expiresAt: '2026-12-01T09:00:00.000Z' });
		const later = grantOf({ id: 'later', expiresAt: '2026-12-20T09:00:00.000Z' });
		const undated = grantOf({ id: 'undated', expiresAt: 'soon' });

		const ids = siteGrantsInOrder([undated, sooner, later]).map((grant) => grant.id);

		expect(ids).toEqual(['later', 'sooner', 'undated']);
	});

	it('leaves the list it is given untouched', () => {
		const list = [grantOf({ id: 'a', expiresAt: '2026-12-01T09:00:00.000Z' }), grantOf({ id: 'b' })];

		siteGrantsInOrder(list);

		expect(list.map((grant) => grant.id)).toEqual(['a', 'b']);
	});
});

describe('renewalEndOf', () => {
	it('reads the date until which the site can renew its sign-in', () => {
		expect(renewalEndOf(grantOf({}))?.toISOString()).toBe('2026-12-20T09:00:00.000Z');
	});

	it('gives no date for one that does not read', () => {
		expect(renewalEndOf(grantOf({ expiresAt: 'soon' }))).toBeNull();
	});
});

describe('siteHostOf', () => {
	it.each([
		['https://team.example.com', 'team.example.com'],
		['https://team.example.com:8443', 'team.example.com:8443'],
		['http://localhost:3000', 'localhost:3000']
	])('names %s as %s', (origin, host) => {
		expect(siteHostOf(origin)).toBe(host);
	});

	it('keeps whole an origin that does not parse', () => {
		expect(siteHostOf('team.example.com')).toBe('team.example.com');
	});
});

describe('isSiteGrantsUnavailable', () => {
	it('reads a 404 as a server without the list of allowed sites', () => {
		expect(isSiteGrantsUnavailable(errorWith(404))).toBe(true);
	});

	it.each([401, 403, 500])('reads a %s as a failure', (status) => {
		expect(isSiteGrantsUnavailable(errorWith(status))).toBe(false);
	});

	it('reads a failure without an answer as a failure', () => {
		expect(isSiteGrantsUnavailable(new Error('Network Error'))).toBe(false);
	});
});

describe('isSiteGrantAlreadyEnded', () => {
	it('reads a 404 as a sign-in that was already gone', () => {
		expect(isSiteGrantAlreadyEnded(errorWith(404))).toBe(true);
	});

	it('reads any other refusal as a sign-in that was not ended', () => {
		expect(isSiteGrantAlreadyEnded(errorWith(500))).toBe(false);
	});
});

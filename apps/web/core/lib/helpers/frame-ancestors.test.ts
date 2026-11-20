import { frameAncestorSources, frameAncestorsPolicy } from './frame-ancestors';

describe('frameAncestorSources (FRAME_ANCESTORS)', () => {
	it('reads origins separated by commas or spaces', () => {
		expect(
			frameAncestorSources('https://intranet.example.com, http://localhost:8080  https://*.example.org')
		).toEqual(['https://intranet.example.com', 'http://localhost:8080', 'https://*.example.org']);
	});

	it('takes an origin written with a trailing slash', () => {
		expect(frameAncestorSources('https://intranet.example.com/')).toEqual(['https://intranet.example.com']);
	});

	it('keeps `*` for a deployment that lets any site frame the app', () => {
		expect(frameAncestorSources('*')).toEqual(['*']);
	});

	it('leaves out what is not an origin, so nothing else reaches the header', () => {
		expect(
			frameAncestorSources("https://a.example.com; script-src 'unsafe-inline' https://b.example.com/app")
		).toEqual([]);
	});

	it('reads nothing from an unset or empty setting', () => {
		expect(frameAncestorSources(undefined)).toEqual([]);
		expect(frameAncestorSources('  ')).toEqual([]);
	});
});

describe('frameAncestorsPolicy', () => {
	it('adds the listed sites after the app itself', () => {
		expect(frameAncestorsPolicy('/auth/passcode', 'https://intranet.example.com')).toBe(
			"frame-ancestors 'self' https://intranet.example.com"
		);
	});

	it('lets no site frame the page where a person allows a site to use their timer, a listed one included', () => {
		expect(frameAncestorsPolicy('/embed/authorize', 'https://intranet.example.com')).toBe("frame-ancestors 'none'");
	});
});

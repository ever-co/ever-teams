// cspell:ignore alish julia rahul
/**
 * normalizeImageUrl — every user avatar 404'd on demo.ever.team. The Gauzy seed stores a
 * ROUTE-RELATIVE `imageUrl` (`assets/images/avatars/avatar-default.svg`, no leading slash, no origin
 * — see `packages/core/src/lib/user/default-users.ts` in ever-gauzy). The Angular Gauzy app renders
 * it correctly because it ships `<base href="/">`; Next.js ships no `<base>`, so the browser resolves
 * the value against the CURRENT ROUTE and requests
 * `/dashboard/team-dashboard/assets/images/avatars/alish.jpg` -> 404. The 404 path therefore changed
 * with whatever page the user was on.
 *
 * The fix normalises such values to root-relative before they ever reach an <img>/<Image> `src`.
 * Absolute, protocol-relative, data:, blob: and already-root-relative values must pass through
 * untouched so real uploaded avatars (S3/MinIO/CDN) keep working.
 */
import { normalizeImageUrl } from './normalize-image-url';

describe('normalizeImageUrl', () => {
	it('prefixes a route-relative seed path so it resolves from the site root', () => {
		expect(normalizeImageUrl('assets/images/avatars/avatar-default.svg')).toBe(
			'/assets/images/avatars/avatar-default.svg'
		);
	});

	it('prefixes any other route-relative path', () => {
		expect(normalizeImageUrl('images/foo.png')).toBe('/images/foo.png');
	});

	it('leaves an already root-relative path untouched', () => {
		expect(normalizeImageUrl('/assets/images/avatars/alish.jpg')).toBe('/assets/images/avatars/alish.jpg');
	});

	it('leaves an absolute https URL untouched', () => {
		expect(normalizeImageUrl('https://cdn.ever.co/avatars/alish.jpg')).toBe(
			'https://cdn.ever.co/avatars/alish.jpg'
		);
	});

	it('leaves an absolute http URL untouched', () => {
		expect(normalizeImageUrl('http://localhost:3000/a.png')).toBe('http://localhost:3000/a.png');
	});

	it('leaves a protocol-relative URL untouched', () => {
		expect(normalizeImageUrl('//cdn.ever.co/avatars/alish.jpg')).toBe('//cdn.ever.co/avatars/alish.jpg');
	});

	it('leaves a data: URI untouched', () => {
		expect(normalizeImageUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(
			'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
		);
	});

	it('leaves a blob: URL untouched', () => {
		expect(normalizeImageUrl('blob:https://demo.ever.team/1234')).toBe('blob:https://demo.ever.team/1234');
	});

	it('trims surrounding whitespace before deciding', () => {
		expect(normalizeImageUrl('  assets/images/avatars/alish.jpg  ')).toBe('/assets/images/avatars/alish.jpg');
	});

	it('returns undefined for undefined', () => {
		expect(normalizeImageUrl(undefined)).toBeUndefined();
	});

	it('returns null for null', () => {
		expect(normalizeImageUrl(null)).toBeNull();
	});

	it('returns an empty string unchanged so falsy fallback rendering still works', () => {
		expect(normalizeImageUrl('')).toBe('');
	});

	it('treats a whitespace-only value as empty rather than turning it into "/"', () => {
		expect(normalizeImageUrl('   ')).toBe('');
	});
});

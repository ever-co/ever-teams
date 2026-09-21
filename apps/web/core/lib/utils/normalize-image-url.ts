// cspell:ignore alish julia rahul
/**
 * Makes an image URL resolve independently of the route the user happens to be on.
 *
 * The Gauzy API can return a ROUTE-RELATIVE image path — the seeded users and employees carry
 * `imageUrl: 'assets/images/avatars/avatar-default.svg'` (no leading slash, no origin). The Angular
 * Gauzy app renders that correctly only because it ships `<base href="/">`. Next.js ships no
 * `<base>`, so the browser resolves the same value against the CURRENT ROUTE and requests
 * `/dashboard/team-dashboard/assets/images/avatars/alish.jpg`, which 404s — and the failing path
 * changes with whatever page the user happens to be on.
 *
 * Anything already resolvable on its own — absolute (`https:`, `data:`, `blob:`, ...),
 * protocol-relative (`//host/...`) or root-relative (`/...`) — is returned untouched, so real
 * uploaded avatars served from S3/MinIO/the CDN keep working.
 *
 * Note: a protocol-relative value is deliberately left alone. It already resolves against the
 * origin's scheme rather than the route, so it is not this function's problem — and rewriting its
 * scheme would be a behaviour change well beyond "stop resolving against the current route".
 * (`next/image` rejects protocol-relative sources, but it did so before this helper existed too.)
 */

/** Matches a URI scheme such as `https:`, `data:` or `blob:` at the start of the value. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function normalizeImageUrl(url: string): string;
export function normalizeImageUrl(url: string | undefined): string | undefined;
export function normalizeImageUrl(url: string | null): string | null;
export function normalizeImageUrl(url: string | null | undefined): string | null | undefined;
export function normalizeImageUrl(url?: string | null): string | null | undefined {
	if (url === null || url === undefined) return url;

	const trimmed = url.trim();

	// Keep empty values empty so callers' `imageUrl ? <Image/> : <Fallback/>` branches still work,
	// and so a whitespace-only value never becomes the site root "/".
	if (!trimmed) return '';

	// Already resolvable without a base: absolute, protocol-relative, or root-relative.
	if (HAS_SCHEME.test(trimmed) || trimmed.startsWith('//') || trimmed.startsWith('/')) return trimmed;

	return `/${trimmed}`;
}

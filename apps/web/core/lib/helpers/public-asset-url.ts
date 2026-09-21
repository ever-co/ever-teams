import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/**
 * Where the BROWSER loads a Gauzy `public/` file from — in practice the task status, priority and size
 * icons (`public/ever-icons/<kind>/<name>.svg`), which Gauzy serves as static files NEXT TO its API
 * rather than under `/api`.
 *
 * Both callers used to build that URL from NEXT_PUBLIC_GAUZY_API_SERVER_URL alone, and a deployment
 * that leaves it unset — the browser then calls the API through THIS app's /api routes, as
 * `.env.docker` documents — got neither an icon nor an error it could act on:
 * - edit-status-modal.tsx fell back to Ever's own production API, so a self-hosted instance requested
 *   the icon of every status it renamed from an Ever host;
 * - generateIconList produced the literal `undefined/public/ever-icons/...`, which the browser
 *   resolves against whatever route the user happens to be on.
 *
 * With no public API origin the icons go through this app instead: `/api/public-assets/<path>` streams
 * `<GAUZY_API_SERVER_ORIGIN>/public/<path>` server-side (app/api/public-assets/[...path]/route.ts),
 * i.e. the very origin this app's /api proxy already uses — the only one the browser can be expected
 * to reach in that mode.
 *
 * next/image note: these sources end in `.svg`, and Next serves an `.svg` source as-is while
 * `images.dangerouslyAllowSVG` is off (shared/lib/get-img-props). They never reach the optimizer, so
 * the image host allowlist (image-hosts.js, image-request.ts, proxy.ts) does not apply to them.
 */

/** The route that streams a Gauzy `public/` file through this app. Mirrored by the route handler. */
export const PUBLIC_ASSET_PROXY_PATH = '/api/public-assets';

/** Any absolute URL (`https:`, `http:`, `data:`, ...): already resolvable on its own. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// Loops, not /\/+$/ and /^\/+/: those regexes backtrack polynomially on a long run of slashes.
function withoutTrailingSlashes(value: string): string {
	let end = value.length;
	while (end > 0 && value[end - 1] === '/') end -= 1;
	return value.slice(0, end);
}

function withoutLeadingSlashes(value: string): string {
	let start = 0;
	while (start < value.length && value[start] === '/') start += 1;
	return value.slice(start);
}

/**
 * The browser URL of a Gauzy `public/` file from the path the API stores for it
 * (`ever-icons/task-statuses/open.svg`).
 *
 * An absolute URL — what the API returns as `fullIconUrl`, or an icon a deployment stored as a full
 * URL — and an empty value are returned untouched. A whitespace-only origin counts as unset, like
 * every other runtime value (env-config.ts).
 */
export function publicAssetUrl(
	path: string | undefined | null,
	apiOrigin: string | undefined = GAUZY_API_BASE_SERVER_URL.value
): string {
	const value = (path ?? '').trim();
	if (!value || HAS_SCHEME.test(value)) return value;

	const relative = withoutLeadingSlashes(value);
	const origin = withoutTrailingSlashes((apiOrigin ?? '').trim());
	return origin ? `${origin}/public/${relative}` : `${PUBLIC_ASSET_PROXY_PATH}/${relative}`;
}

import { deleteCookie as _deleteCookie, getCookie as _getCookie, setCookie as _setCookie } from 'cookies-next';

type DeleteCookieOptions = Parameters<typeof _deleteCookie>[1];
type CookieOptions = Parameters<typeof _setCookie>[2];

/** Whether the page, or on the server the incoming request, is served over https. */
const isHttps = (options: CookieOptions): boolean => {
	const url = options?.req?.url ?? (typeof window !== 'undefined' ? window.location.href : undefined);
	try {
		return !!url && new URL(url).protocol === 'https:';
	} catch {
		return false;
	}
};

/**
 * SameSite=Lax keeps the cookies (the auth tokens among them) off cross-site subrequests and form posts, and Secure
 * keeps them off plain http. Secure follows the protocol in use rather than NODE_ENV, so an http setup (local dev,
 * the desktop app, a self-hosted instance without TLS) still gets its cookies stored.
 */
const withSafeAttributes = (options: CookieOptions): CookieOptions => ({
	sameSite: 'lax',
	secure: isHttps(options),
	...options
});

export const deleteCookie: typeof _deleteCookie = (key, options) => {
	_deleteCookie(key, options);

	// Backward cleanup: remove any domain-based copies from older sessions
	// by retrying with explicit domain values when provided via options.
	const domain = (options as any)?.domain;
	if (domain) {
		_deleteCookie(key, { ...options, domain });
	}
};

/**
 * Delete a cookie written with crossSite=true (the access token), using the attributes `setCookie` writes it with.
 * A forced `Secure` would be rejected on a plain-http page and leave the token chunks behind after logout.
 */
export const deleteCookieCrossSite = (key: string, options?: DeleteCookieOptions) => {
	_deleteCookie(key, withSafeAttributes(options));
};

export const getCookie: typeof _getCookie = (key, options) => {
	return _getCookie(key, options);
};

type SetCookie = (...params: [...Parameters<typeof _setCookie>, ...[crossSite?: boolean]]) => void;

export const setCookie: SetCookie = (key, data, options, _crossSite) => {
	// Intentionally ignore crossSite/domain fan-out; set only for the current request/host.
	_setCookie(key, data, withSafeAttributes(options));
};

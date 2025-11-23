import { deleteCookie as _deleteCookie, getCookie as _getCookie, setCookie as _setCookie } from 'cookies-next';

type DeleteCookieOptions = Parameters<typeof _deleteCookie>[1];

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
 * Delete a cookie with cross-site attributes (SameSite=None; Secure)
 * Required for cookies set with crossSite=true, as js-cookie requires exact attribute match to delete
 */
export const deleteCookieCrossSite = (key: string, options?: DeleteCookieOptions) => {
	const crossSiteOptions = {
		sameSite: 'none' as const,
		secure: true,
		...options
	};

	_deleteCookie(key, crossSiteOptions);
};

export const getCookie: typeof _getCookie = (key, options) => {
	return _getCookie(key, options);
};

type SetCookie = (...params: [...Parameters<typeof _setCookie>, ...[crossSite?: boolean]]) => void;

export const setCookie: SetCookie = (key, data, options, _crossSite) => {
	// Intentionally ignore crossSite/domain fan-out; set only for the current request/host.
	_setCookie(key, data, options);
};

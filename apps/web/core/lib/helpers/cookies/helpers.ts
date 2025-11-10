import { COOKIE_DOMAINS } from '@/core/constants/config/constants';
import { deleteCookie as _deleteCookie, getCookie as _getCookie, setCookie as _setCookie } from 'cookies-next';

type DeleteCookieOptions = Parameters<typeof _deleteCookie>[1];

export const deleteCookie: typeof _deleteCookie = (key, options) => {
	_deleteCookie(key, options);

	COOKIE_DOMAINS.value.forEach((domain) => {
		_deleteCookie(key, {
			domain,
			...options
		});
	});
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

	COOKIE_DOMAINS.value.forEach((domain) => {
		_deleteCookie(key, {
			domain,
			...crossSiteOptions
		});
	});
};

export const getCookie: typeof _getCookie = (key, options) => {
	return _getCookie(key, options);
};

type SetCookie = (...params: [...Parameters<typeof _setCookie>, ...[crossSite?: boolean]]) => void;

export const setCookie: SetCookie = (key, data, options, crossSite) => {
	_setCookie(key, data, options);

	crossSite &&
		COOKIE_DOMAINS.value.forEach((domain) => {
			_setCookie(key, data, {
				domain,
				...options
			});
		});
};

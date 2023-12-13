import { COOKIE_DOMAINS } from '@app/constants';
import { deleteCookie as _deleteCookie, getCookie as _getCookie, setCookie as _setCookie } from 'cookies-next';

export const deleteCookie: typeof _deleteCookie = (key, options) => {
	_deleteCookie(key, options);

	COOKIE_DOMAINS.value.forEach((domain) => {
		_deleteCookie(key, {
			domain,
			...options
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

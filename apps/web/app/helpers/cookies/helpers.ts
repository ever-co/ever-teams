import { COOKIE_DOMAINS } from '@app/constants';
import {
	deleteCookie as _deleteCookie,
	getCookie as _getCookie,
	setCookie as _setCookie,
} from 'cookies-next';

export const deleteCookie: typeof _deleteCookie = (key, options) => {
	_deleteCookie(key, options);

	COOKIE_DOMAINS.forEach((domain) => {
		_deleteCookie(key, {
			domain,
			...options,
		});
	});
};

export const getCookie: typeof _getCookie = (key, options) => {
	return _getCookie(key, options);
};

export const setCookie: typeof _setCookie = (key, data, options) => {
	if (COOKIE_DOMAINS.length === 0) {
		_setCookie(key, data, options);
	}

	COOKIE_DOMAINS.forEach((domain) => {
		_setCookie(key, data, {
			domain,
			...options,
		});
	});
};

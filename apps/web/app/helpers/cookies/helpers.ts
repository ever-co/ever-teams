import {
	deleteCookie as _deleteCookie,
	getCookie as _getCookie,
	setCookie as _setCookie,
} from 'cookies-next';

export const deleteCookie: typeof _deleteCookie = (key, options) => {
	_deleteCookie(key, options);
};

export const getCookie: typeof _getCookie = (key, options) => {
	return _getCookie(key, options);
};

export const setCookie: typeof _setCookie = (key, data, options) => {
	_setCookie(key, data, options);
};

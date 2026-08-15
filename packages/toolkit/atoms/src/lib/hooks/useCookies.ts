import {
	getCookie as _getCookie,
	deleteCookie as _deleteCookie,
	setCookie as _setCookie,
	getCookies
} from 'cookies-next';

export interface CookieOptions {
	expires?: Date;
	maxAge?: number;
	domain?: string;
	path?: string;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: boolean | 'lax' | 'strict' | 'none';
	priority?: 'low' | 'medium' | 'high';
	encode?: (value: string) => string;
	partitioned?: boolean;
}

const useCookies = () => {
	const getCookie = (name: string) => {
		return _getCookie(name);
	};

	const setNewCookie = (name: string, value: string, options?: CookieOptions) => {
		return _setCookie(name, value, options);
	};

	const deleteCookie = (name: string, options?: CookieOptions) => {
		return _deleteCookie(name, options);
	};

	const cookies = getCookies();

	return { cookies, getCookie, setNewCookie, deleteCookie };
};

export { useCookies };

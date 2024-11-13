import {
	APPLICATION_DEFAULT_LANGUAGE,
	APPLICATION_LANGUAGES_CODE,
	DEFAULT_APP_PATH,
	DEFAULT_MAIN_PATH,
	PROTECTED_APP_URL_PATHS,
	REFRESH_TOKEN_COOKIE_NAME,
	TOKEN_COOKIE_NAME
} from '@app/constants';
import { cookiesKeys } from '@app/helpers/cookies';
import { currentAuthenticatedUserRequest } from '@app/services/server/requests/auth';
import { range } from 'lib/utils';
import { NextRequest, NextResponse } from 'next/server';

import createMiddleware from 'next-intl/middleware';

export const config = {
	matcher: [
		'/',
		'/(en|de|ar|bg|zh|nl|de|he|it|pl|pt|ru|es|fr)/:path*',
		'/((?!api|_next|_vercel|.*\\..*).*)',
		'/auth/(.*)',
		'/profile/:path*',
		'/settings/(.*)',
		'/task(.*)',
		'/reports/(.*)',
		'/meet(.*)',
		'/board(.*)',
		'/kanban(.*)',
		'/unauthorized(.*)'
	]
};

export { auth as authMiddleware } from './auth';

export async function middleware(request: NextRequest) {
	const nextIntlMiddleware = createMiddleware({
		defaultLocale: APPLICATION_DEFAULT_LANGUAGE,
		locales: APPLICATION_LANGUAGES_CODE,
		// pathnames,
		localePrefix: 'as-needed'
	});

	// Setting cookies on the response
	// let response = NextResponse.next();
	let response = nextIntlMiddleware(request);

	const paths = new URL(request.url).pathname.split('/').filter(Boolean);

	if (
		!paths.includes('join') &&
		(paths[0] === 'team' || (APPLICATION_LANGUAGES_CODE.includes(paths[0]) && paths[1] === 'team'))
	) {
		return response;
	}

	let access_token = null;

	const totalChunksCookie = request.cookies.get(`${TOKEN_COOKIE_NAME}_totalChunks`)?.value.trim();
	if (!totalChunksCookie) {
		access_token = request.cookies.get(TOKEN_COOKIE_NAME)?.value.trim() || '';
	} else if (totalChunksCookie) {
		const totalChunks = parseInt(totalChunksCookie);
		const chunks = range(totalChunks).map((index) => {
			const chunkCookie = request.cookies.get(`${TOKEN_COOKIE_NAME}${index}`)?.value.trim();

			if (!chunkCookie) {
				return null; // Chunk cookie not found.
			}

			return chunkCookie;
		});

		// Concatenate and return the large string.
		access_token = chunks.join('');
	}

	// request.cookies.get(TOKEN_COOKIE_NAME)?.value.trim();
	const refresh_token = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value.trim();

	const url = new URL(request.url);

	const deny_redirect = (defaultRoute: boolean) => {
		const redirectToPassCode = defaultRoute || url.pathname == DEFAULT_MAIN_PATH;
		response = NextResponse.redirect(url.origin + (redirectToPassCode ? DEFAULT_APP_PATH : '/unauthorized'));
		cookiesKeys().forEach((key) => {
			response.cookies.set(key, '');
		});
		response.cookies.delete(`${TOKEN_COOKIE_NAME}_totalChunks`);
	};

	const protected_path = PROTECTED_APP_URL_PATHS.some((v) => {
		return v.test(url.pathname);
	});

	if ((protected_path && !refresh_token) || (protected_path && !access_token)) {
		deny_redirect(false);
		// Next condition, if all tokens are presents
	} else if (protected_path && access_token) {
		const res = await currentAuthenticatedUserRequest({
			bearer_token: access_token
		}).catch(() => {
			deny_redirect(true);
		});

		if (!res || !res.response.ok) {
			deny_redirect(true);
		} else {
			response.headers.set('x-user', JSON.stringify(res.data));
		}
	} else if (!protected_path && (refresh_token || access_token)) {
		console.log('url.origin + DEFAULT_MAIN_PATH', url.origin + DEFAULT_MAIN_PATH);
		// response = NextResponse.redirect(url.origin + DEFAULT_MAIN_PATH);
	}

	return response;
}

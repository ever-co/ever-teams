import {
	DEFAULT_APP_PATH,
	DEFAULT_MAIN_PATH,
	PROTECTED_APP_URL_PATHS,
	REFRESH_TOKEN_COOKIE_NAME,
	TOKEN_COOKIE_NAME
} from '@app/constants';
import { cookiesKeys } from '@app/helpers/cookies';
import { currentAuthenticatedUserRequest } from '@app/services/server/requests/auth';
import { range } from 'lib/utils';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

export const config = {
	matcher: [
		'/',
		'/auth/(.*)',
		'/profile/:path*',
		'/settings/(.*)',
		'/task(.*)',
		'/meet(.*)',
		'/board(.*)',
		'/(de|en)/:path*'
	]
};

export async function middleware(request: NextRequest) {
	// Setting cookies on the response
	let response = NextResponse.next();

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

	const deny_redirect = () => {
		response = NextResponse.redirect(url.origin + DEFAULT_APP_PATH, {});
		cookiesKeys().forEach((key) => {
			response.cookies.set(key, '');
		});
		response.cookies.delete(`${TOKEN_COOKIE_NAME}_totalChunks`);
	};

	const protected_path = PROTECTED_APP_URL_PATHS.some((v) => {
		return v.test(url.pathname);
	});

	if ((protected_path && !refresh_token) || (protected_path && !access_token)) {
		deny_redirect();
		// Next condition, if all tokens are presents
	} else if (protected_path && access_token) {
		const res = await currentAuthenticatedUserRequest({
			bearer_token: access_token
		}).catch(() => {
			deny_redirect();
		});

		if (!res || !res.response.ok) {
			deny_redirect();
		} else {
			response.headers.set('x-user', JSON.stringify(res.data));
		}
	} else if (!protected_path && (refresh_token || access_token)) {
		response = NextResponse.redirect(url.origin + DEFAULT_MAIN_PATH);
	}

	return response;
}

// createMiddleware({
// 	// A list of all locales that are supported
// 	locales: ['en', 'de'],

// 	// Used when no locale matches
// 	defaultLocale: 'en'
// })

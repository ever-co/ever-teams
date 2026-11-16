import { NextResponse } from 'next/server';
import { isTrustedBoardOrigin } from '@/core/lib/board/board-app';

/**
 * The answers of the routes the Board app calls on this deployment (`/api/board/*`). The Board runs on another origin
 * (NEXT_PUBLIC_BOARD_APP_DOMAIN) and calls them with `fetch(url, { credentials: 'include' })`: the browser sends this
 * deployment's session cookies along, and these CORS headers let the trusted Board origin, and no other, read the
 * answer. A request from any other origin, or without one, gets 403 before anything else is done.
 */

/** One person's answer, for one origin: never kept by a cache, never reused for another caller. */
export function privateBoardAnswer(response: NextResponse): NextResponse {
	response.headers.set('Cache-Control', 'no-store');
	response.headers.set('Vary', 'Origin, Cookie');
	return response;
}

/** `response`, readable by the Board origin `origin` with its credentials. */
export function forBoard(response: NextResponse, origin: string): NextResponse {
	response.headers.set('Access-Control-Allow-Origin', origin);
	response.headers.set('Access-Control-Allow-Credentials', 'true');
	return privateBoardAnswer(response);
}

/** The answer to a request that does not come from the trusted Board origin: no CORS header, so nothing is readable. */
export function forbiddenForBoard(): NextResponse {
	return privateBoardAnswer(NextResponse.json({ message: 'Forbidden' }, { status: 403 }));
}

/** The answer to the Board's CORS preflight of `methods`, or 403 for any other origin. */
export function boardPreflight(req: Request, methods: string): NextResponse {
	const origin = req.headers.get('origin');
	if (!isTrustedBoardOrigin(origin)) {
		return forbiddenForBoard();
	}

	const response = new NextResponse(null, { status: 204 });
	response.headers.set('Access-Control-Allow-Methods', methods);
	response.headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
	response.headers.set('Access-Control-Max-Age', '600');
	return forBoard(response, origin);
}

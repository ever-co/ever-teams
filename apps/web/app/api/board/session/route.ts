import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { requestAccessToken, requestCookies } from '@/core/services/server/request-cookies';
import { boardPreflight, forBoard, forbiddenForBoard } from '@/core/services/server/board-cors';
import { boardSessionUser, isTrustedBoardOrigin } from '@/core/lib/board/board-app';

/**
 * Who is signed in to this deployment, for the Board app (NEXT_PUBLIC_BOARD_APP_DOMAIN).
 *
 * The Board runs on another origin and cannot read this app's cookies, which stay on this host. It calls this route
 * with `fetch(url, { credentials: 'include' })`: the browser sends the session cookies along (the Board and this app
 * are subdomains of one site, so SameSite=Lax lets them through), and the CORS headers let the trusted Board origin,
 * and no other, read the answer. The answer names the person (id, name, picture); the access token never leaves
 * this app, and every deployment checks its own sessions against its own API.
 *
 * Only the Board calls this route: any other origin, or a request without one, gets 403 and no session check.
 */
export async function GET(req: Request) {
	const origin = req.headers.get('origin');
	if (!isTrustedBoardOrigin(origin)) {
		return forbiddenForBoard();
	}

	// No session cookie at all: no one is signed in here, and the API is not asked about an empty token
	if (!requestAccessToken(requestCookies(req))) {
		return forBoard(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }), origin);
	}

	const guard = await authenticatedGuard(req, new NextResponse());
	// The guard's own status, readable by the Board: 401 for a refused session, 503 when the API could not answer
	if (!guard.user) {
		return forBoard(guard.deny(), origin);
	}

	return forBoard(NextResponse.json(boardSessionUser(guard.user)), origin);
}

// A plain GET needs no preflight; this answers one should the Board's request ever need it.
export function OPTIONS(req: Request) {
	return boardPreflight(req, 'GET');
}

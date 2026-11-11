import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
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

function privateAnswer(response: NextResponse): NextResponse {
	// One person's answer, for one origin: never kept by a cache, never reused for another caller
	response.headers.set('Cache-Control', 'no-store');
	response.headers.set('Vary', 'Origin, Cookie');
	return response;
}

function forBoard(response: NextResponse, origin: string): NextResponse {
	response.headers.set('Access-Control-Allow-Origin', origin);
	response.headers.set('Access-Control-Allow-Credentials', 'true');
	return privateAnswer(response);
}

function forbidden(): NextResponse {
	return privateAnswer(NextResponse.json({ message: 'Forbidden' }, { status: 403 }));
}

export async function GET(req: Request) {
	const origin = req.headers.get('origin');
	if (!isTrustedBoardOrigin(origin)) {
		return forbidden();
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
	const origin = req.headers.get('origin');
	if (!isTrustedBoardOrigin(origin)) {
		return forbidden();
	}

	const response = new NextResponse(null, { status: 204 });
	response.headers.set('Access-Control-Allow-Methods', 'GET');
	response.headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
	response.headers.set('Access-Control-Max-Age', '600');
	return forBoard(response, origin);
}

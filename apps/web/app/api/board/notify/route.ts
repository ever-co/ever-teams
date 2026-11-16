import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { requestAccessToken, requestCookies } from '@/core/services/server/request-cookies';
import { boardPreflight, forBoard, forbiddenForBoard } from '@/core/services/server/board-cors';
import { notifyBoardRequest } from '@/core/services/server/requests/employee-notification';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { isTrustedBoardOrigin } from '@/core/lib/board/board-app';
import { readBoardNotifyRequest } from '@/core/lib/board/board-notify';
import { readCappedText } from '@/core/lib/auth/ever-id/body';

/**
 * Far more than a request can need (50 employee ids, a Board id, a name of 200 characters and a link of 2048): a
 * larger body is refused while it is read, never buffered whole.
 */
const MAX_BODY_BYTES = 16_384;

function jsonOf(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/**
 * Tells colleagues that the signed-in person shared a Board with them, or mentioned them in one (ever-co/ever-teams
 * #5022), for the Board app (NEXT_PUBLIC_BOARD_APP_DOMAIN). The Board cannot call Gauzy itself: the access token stays
 * on this host. It posts `{ kind: 'share' | 'mention', receiverEmployeeIds, roomId | snapshotId, boardName?, link? }`
 * here with `credentials: 'include'`, and this route forwards it to Gauzy with the session of the cookies, in the
 * organization the person works in on this deployment. Gauzy checks who may be told, and answers `{ notified }`.
 *
 * A credentialed write from another origin: the exact Board origin is the guard against cross-site requests (any
 * other, or none, gets 403 before anything else), and only a JSON body is read, which a plain form cannot send and
 * which makes the browser ask first (preflight). A body over MAX_BODY_BYTES gets 413. Gauzy's refusals (400, 401,
 * 403, 429, and the 404 of an API without these routes) reach the Board with their status. The link is never logged.
 */
export async function POST(req: Request) {
	const origin = req.headers.get('origin');
	if (!isTrustedBoardOrigin(origin)) {
		return forbiddenForBoard();
	}

	const contentType = req.headers.get('content-type') ?? '';
	if (!/^application\/json\s*(;|$)/i.test(contentType)) {
		return forBoard(
			NextResponse.json({ message: 'Send the request as application/json' }, { status: 415 }),
			origin
		);
	}

	// No session cookie at all: no one is signed in here, and the API is not asked about an empty token
	if (!requestAccessToken(requestCookies(req))) {
		return forBoard(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }), origin);
	}

	// Read with a cap before the session is checked: the Origin header only binds browsers, so anyone can get this far
	const text = await readCappedText(req, MAX_BODY_BYTES);
	if (text === null) {
		return forBoard(NextResponse.json({ message: 'The request is too large' }, { status: 413 }), origin);
	}
	const request = readBoardNotifyRequest(jsonOf(text));
	if (!request.ok) {
		return forBoard(NextResponse.json({ message: request.messages }, { status: 400 }), origin);
	}

	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) {
		return forBoard(guard.deny(), origin);
	}

	try {
		const { data } = await notifyBoardRequest({
			kind: request.kind,
			data: { ...request.input, organizationId: guard.organizationId || undefined },
			bearer_token: guard.access_token
		});
		return forBoard(NextResponse.json({ notified: data?.notified ?? 0 }, { status: 201 }), origin);
	} catch (error) {
		return forBoard(await gauzyErrorResponse(error, 'Could not notify about the Board'), origin);
	}
}

export function OPTIONS(req: Request) {
	return boardPreflight(req, 'POST');
}

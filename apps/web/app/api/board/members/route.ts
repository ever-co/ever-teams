import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { requestAccessToken, requestCookies } from '@/core/services/server/request-cookies';
import { boardPreflight, forBoard, forbiddenForBoard } from '@/core/services/server/board-cors';
import { getAllOrganizationTeamRequest } from '@/core/services/server/requests/organization-team';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { isTrustedBoardOrigin } from '@/core/lib/board/board-app';
import { boardMembersOf } from '@/core/lib/board/board-notify';

/**
 * The colleagues the Board app (NEXT_PUBLIC_BOARD_APP_DOMAIN) can share a Board with or mention in one (ever-co/
 * ever-teams#5022): the members of the signed-in person's teams in the organization they work in on this deployment,
 * without themself, each as `{ employeeId, name, imageUrl }` and nothing more. Called by the Board with
 * `credentials: 'include'`; any other origin, or none, gets 403 before any session check.
 */
export async function GET(req: Request) {
	const origin = req.headers.get('origin');
	if (!isTrustedBoardOrigin(origin)) {
		return forbiddenForBoard();
	}

	if (!requestAccessToken(requestCookies(req))) {
		return forBoard(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }), origin);
	}

	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) {
		return forBoard(guard.deny(), origin);
	}

	const user = guard.user as { tenantId?: string | null; employee?: { id?: string | null } | null };
	try {
		const { data } = await getAllOrganizationTeamRequest(
			{
				organizationId: guard.organizationId,
				// The session's tenant, never the cookie's, which the browser can write
				tenantId: user.tenantId ?? '',
				relations: ['members', 'members.employee', 'members.employee.user']
			},
			guard.access_token
		);
		const members = boardMembersOf(data?.items ?? [], user.employee?.id);
		return forBoard(NextResponse.json({ items: members }), origin);
	} catch (error) {
		return forBoard(await gauzyErrorResponse(error, 'Could not list the Board members'), origin);
	}
}

export function OPTIONS(req: Request) {
	return boardPreflight(req, 'GET');
}

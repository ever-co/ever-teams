import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getAllTeamInvitationsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);
	if (!user) {
		return $res('Unauthorized');
	}

	// Get all team invitations (all roles)
	try {
		const { data } = await getAllTeamInvitationsRequest(
			{
				tenantId,
				teamId,
				organizationId
			},
			access_token
		);
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The list of invitations could not be read.');
	}
}

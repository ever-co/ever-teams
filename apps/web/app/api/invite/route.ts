import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getAllTeamInvitationsRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);
	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' });
	}

	// WORKAROUND: Use combined request to get all invitations (EMPLOYEE + non-EMPLOYEE)
	const { data } = await getAllTeamInvitationsRequest(
		{
			tenantId,
			teamId,
			organizationId
		},
		access_token
	);

	return $res(data);
}

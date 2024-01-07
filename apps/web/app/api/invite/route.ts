import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTeamInvitationsRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'Unauthorized' });

	const { data } = await getTeamInvitationsRequest(
		{
			tenantId,
			teamId,
			organizationId,
			role: 'EMPLOYEE'
		},
		access_token
	);

	$res(data);
}

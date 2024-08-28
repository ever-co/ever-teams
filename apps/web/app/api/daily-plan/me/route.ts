import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getMyDailyPlansRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();

	const {
		$res,
		user,
		tenantId,
		organizationId,
		teamId: organizationTeamId,
		access_token
	} = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const response = await getMyDailyPlansRequest({
		bearer_token: access_token,
		organizationId,
		tenantId,
		organizationTeamId
	});

	return $res(response.data);
}

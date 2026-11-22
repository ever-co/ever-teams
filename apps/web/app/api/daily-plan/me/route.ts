import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getMyDailyPlansRequest, readResponseShape } from '@/core/services/server/requests';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
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

	try {
		const response = await getMyDailyPlansRequest({
			bearer_token: access_token,
			organizationId,
			tenantId,
			organizationTeamId,
			// The browser's `shape=lean` reaches the API through the proxy too (ever-co/ever-gauzy#11730)
			shape: readResponseShape(new URL(req.url).searchParams)
		});

		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Your plans could not be read.');
	}
}

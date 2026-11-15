import { NextResponse } from 'next/server';
import { apiErrorStatusOf, unwrapRejection } from '@/core/services/server/fetch';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getInvitedMeetingsRequest } from '@/core/services/server/requests/employee-appointment';

/**
 * The proxy-mode twin of Gauzy's `GET /employee-appointment/invited`: the meetings others host that the member is
 * invited to (#5022). Gauzy's refusal goes back with its status (404 from a platform without the route).
 */
export async function GET(req: Request) {
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, new NextResponse());

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	try {
		const { data } = await getInvitedMeetingsRequest({
			query: new URL(req.url).searchParams.toString(),
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(data);
	} catch (error) {
		const apiError = await unwrapRejection(error);
		const apiStatus = apiErrorStatusOf(apiError);
		if (apiStatus === undefined) throw error;
		return NextResponse.json(apiError, { status: apiStatus });
	}
}

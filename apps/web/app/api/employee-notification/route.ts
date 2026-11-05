import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getEmployeeNotificationsRequest } from '@/core/services/server/requests/employee-notification';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (no logout then)
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const query = searchParams.toString();

	try {
		const { data } = await getEmployeeNotificationsRequest({ query, bearer_token: access_token, tenantId });

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Notifications request failed');
	}
}

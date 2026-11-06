import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { markAllEmployeeNotificationsReadRequest } from '@/core/services/server/requests/employee-notification';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function PUT(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	try {
		const { data } = await markAllEmployeeNotificationsReadRequest({ bearer_token: access_token, tenantId });

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Marking notifications as read failed');
	}
}

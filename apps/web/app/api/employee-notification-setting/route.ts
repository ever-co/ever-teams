import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	createEmployeeNotificationSettingRequest,
	getEmployeeNotificationSettingsRequest
} from '@/core/services/server/requests/employee-notification';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { notificationSettingSwitchesSchema } from '@/core/lib/validation/employee-notification';

export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);
	const query = searchParams.toString();

	try {
		const { data } = await getEmployeeNotificationSettingsRequest({ query, bearer_token: access_token, tenantId });

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Notification settings request failed');
	}
}

export async function POST(req: Request) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const requestBody: unknown = await req.json().catch(() => null);
	const parsed = notificationSettingSwitchesSchema.safeParse(requestBody);
	if (!parsed.success) {
		return NextResponse.json({ error: 'Each notification type takes true or false' }, { status: 400 });
	}

	// Gauzy files the row for the caller's own employee and requires `preferences`; the scope is the session's.
	const data = { ...parsed.data, preferences: {}, tenantId, organizationId };

	try {
		const response = await createEmployeeNotificationSettingRequest({ data, bearer_token: access_token, tenantId });

		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Notification settings save failed');
	}
}

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { updateEmployeeNotificationSettingRequest } from '@/core/services/server/requests/employee-notification';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { notificationSettingSwitchesSchema } from '@/core/lib/validation/employee-notification';

const settingIdSchema = z.guid();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsedId = settingIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ error: 'A notification setting id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const requestBody: unknown = await req.json().catch(() => null);
	const parsed = notificationSettingSwitchesSchema.safeParse(requestBody);
	if (!parsed.success) {
		return NextResponse.json({ error: 'Each notification type takes true or false' }, { status: 400 });
	}

	const data = { ...parsed.data, tenantId, organizationId };

	try {
		const response = await updateEmployeeNotificationSettingRequest({
			id: parsedId.data,
			data,
			bearer_token: access_token,
			tenantId
		});

		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Notification settings save failed');
	}
}

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { updateEmployeeNotificationRequest } from '@/core/services/server/requests/employee-notification';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { notificationPatchSchema } from '@/core/lib/validation/employee-notification';

const notificationIdSchema = z.guid();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsedId = notificationIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ error: 'A notification id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return $res('Unauthorized');

	const requestBody: unknown = await req.json().catch(() => null);
	const parsed = notificationPatchSchema.safeParse(requestBody);
	if (!parsed.success) {
		return NextResponse.json({ error: 'Only the read, archived and snooze state can change' }, { status: 400 });
	}

	try {
		const { data } = await updateEmployeeNotificationRequest({
			id: parsedId.data,
			data: parsed.data,
			bearer_token: access_token,
			tenantId
		});

		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Notification update failed');
	}
}

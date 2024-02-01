import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { taskActivityRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, organizationId, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { taskId } = searchParams as unknown as {
		taskId: string;
	};

	const { data } = await taskActivityRequest(
		{
			'taskIds[0]': taskId,
			tenantId,
			organizationId,
			defaultRange: 'false'
		},
		access_token
	);

	return $res(data);
}

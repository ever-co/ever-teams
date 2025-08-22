import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { taskActivityRequest } from '@/core/services/server/requests';
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
			taskIds: [taskId],
			tenantId,
			organizationId,
			defaultRange: 'false'
		},
		access_token
	);

	return $res(data);
}

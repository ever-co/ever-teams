import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getPlansByTask } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
	const taskId = (await params).taskId;
	const res = new NextResponse();
	if (!taskId) {
		return;
	}

	const {
		$res,
		user,
		tenantId,
		organizationId,
		teamId: organizationTeamId,
		access_token
	} = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const response = await getPlansByTask({
		taskId,
		bearer_token: access_token,
		organizationId,
		tenantId,
		organizationTeamId
	});

	return $res(response.data);
}

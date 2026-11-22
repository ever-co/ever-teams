import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getPlansByTask } from '@/core/services/server/requests';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
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

	try {
		const response = await getPlansByTask({
			taskId,
			bearer_token: access_token,
			organizationId,
			tenantId,
			organizationTeamId
		});

		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, "The task's plans could not be read.");
	}
}

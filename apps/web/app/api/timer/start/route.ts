import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, startTimerRequest } from '@/core/services/server/requests';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const {
		$res,
		user,
		tenantId,
		access_token,
		organizationId,
		taskId: activeTaskIdCookie,
		teamId: organizationTeamId
	} = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	// The caller names the task to start; the cookie is only a fallback for an older client.
	const body = (await req.json().catch(() => ({}))) as { taskId?: string };
	const taskId = body.taskId || activeTaskIdCookie;

	await startTimerRequest(
		{
			tenantId: tenantId || '',
			organizationId: organizationId || '',
			taskId: taskId || '',
			logType: 'TRACKED',
			source: ETimeLogSource.TEAMS,
			tags: [],
			organizationTeamId
		},
		access_token || ''
	);

	const { data: timerStatus } = await getTimerStatusRequest(
		{ tenantId: tenantId || '', organizationId: organizationId || '' },
		access_token || ''
	);

	return $res(timerStatus);
}

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
		taskId,
		teamId: organizationTeamId
	} = await authenticatedGuard(req, res);
	console.log({ user, tenantId, taskId });
	if (!user) return $res('Unauthorized');

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

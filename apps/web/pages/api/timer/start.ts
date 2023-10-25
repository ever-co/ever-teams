import { TimerSource } from '@app/interfaces/ITimer';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getTimerStatusRequest, startTimerRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const {
		$res,
		user,
		tenantId,
		access_token,
		organizationId,
		taskId,
		teamId: organizationTeamId
	} = await authenticatedGuard(req, res);
	if (!user) return $res();

	await startTimerRequest(
		{
			tenantId,
			organizationId,
			taskId,
			logType: 'TRACKED',
			source: TimerSource.TEAMS,
			tags: [],
			organizationTeamId
		},
		access_token
	);

	const { data: timerStatus } = await getTimerStatusRequest({ tenantId, organizationId }, access_token);

	return $res.json(timerStatus);
}

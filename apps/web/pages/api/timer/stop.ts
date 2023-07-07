import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getTimerStatusRequest,
	stopTimerRequest,
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, tenantId, access_token, organizationId, taskId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const { source } = req.body;
	await stopTimerRequest(
		{
			tenantId,
			organizationId,
			taskId,
			logType: 'TRACKED',
			source: source,
			tags: [],
		},
		access_token
	);

	const { data: timerStatus } = await getTimerStatusRequest(
		{ tenantId, organizationId },
		access_token
	);

	return $res.json(timerStatus);
}

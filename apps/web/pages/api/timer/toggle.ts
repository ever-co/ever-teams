import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getTimerStatusRequest,
	stopTimerRequest,
	toggleTimerRequest,
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, tenantId, access_token, organizationId, taskId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	if (req.method !== 'POST') {
		$res.status(405).send({});
		return;
	}

	await toggleTimerRequest(
		{
			source: 'BROWSER',
			logType: 'TRACKED',
			tenantId,
			taskId,
			organizationId,
			tags: [],
		},
		access_token
	);

	await stopTimerRequest(
		{
			tenantId,
			organizationId,
			taskId,
			logType: 'TRACKED',
			source: 'BROWSER',
			tags: [],
		},
		access_token
	);

	const { data: timerStatus } = await getTimerStatusRequest(
		{ tenantId, organizationId, source: 'BROWSER' },
		access_token
	);

	return $res.json(timerStatus);
}

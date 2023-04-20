import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getTimerStatusRequest,
	syncTimeSlotRequest,
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, tenantId, access_token, organizationId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	if (req.method !== 'POST') {
		$res.status(405).send({});
		return;
	}

	await syncTimeSlotRequest(
		{
			tenantId,
			organizationId,
			logType: 'TRACKED',
			source: 'BROWSER',
			employeeId: user.employee.id,
			duration: 5,
		},
		access_token
	);

	const { data: timerStatus } = await getTimerStatusRequest(
		{ tenantId, organizationId, source: 'BROWSER' },
		access_token
	);

	return $res.json(timerStatus);
}

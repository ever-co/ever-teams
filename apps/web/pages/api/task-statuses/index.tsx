import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	createStatusRequest,
	getTaskStatusListRequest,
} from '@app/services/server/requests/taskStatus';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId, organizationId } =
		await authenticatedGuard(req, res);

	if (!user) return $res();

	const { activeTeamId } = req.query;

	const par = {
		tenantId,
		organizationId,
		activeTeamId: (activeTeamId as string) || null,
	};

	switch (req.method) {
		case 'GET':
			return $res.json(await getTaskStatusListRequest(par, access_token));
		case 'POST':
			return $res.json(
				await createStatusRequest(req.body, access_token, req.body?.tenantId)
			);
	}
}

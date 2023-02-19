import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getTeamTasksRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, organizationId, tenantId } = await authenticatedGuard(
		req,
		res
	);
	if (!user) return $res();
	let tasks;

	switch (req.method) {
		case 'GET': {
			tasks = await getTeamTasksRequest({
				tenantId,
				organizationId,
				bearer_token: access_token,
			});
		}
	}

	return $res.status(200).json(tasks);
}

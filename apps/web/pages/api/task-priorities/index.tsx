import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getTaskPrioritiesListRequest } from '@app/services/server/requests/task-priorities';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId, organizationId } =
		await authenticatedGuard(req, res);

	if (!user) return $res();

	const par = {
		tenantId,
		organizationId,
	};

	switch (req.method) {
		case 'GET':
			return $res.json(await getTaskPrioritiesListRequest(par, access_token));
	}
}

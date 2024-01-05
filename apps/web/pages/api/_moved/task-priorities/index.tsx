import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { createPrioritiesRequest, getTaskPrioritiesListRequest } from '@app/services/server/requests/task-priorities';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res();

	const { organizationTeamId } = req.query;

	const par = {
		tenantId,
		organizationId,
		organizationTeamId: (organizationTeamId as string) || null
	};

	switch (req.method) {
		case 'GET':
			return $res.json(await getTaskPrioritiesListRequest(par, access_token));
		case 'POST':
			return $res.json(await createPrioritiesRequest(req.body, access_token, req.body?.tenantId));
	}
}

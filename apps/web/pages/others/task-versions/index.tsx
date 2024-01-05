import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { createVersionRequest, getTaskVersionListRequest } from '@app/services/server/requests/task-version';
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
			return $res.json(await getTaskVersionListRequest(par, access_token));
		case 'POST':
			return $res.json(await createVersionRequest(req.body, access_token, req.body?.tenantId));
	}
}

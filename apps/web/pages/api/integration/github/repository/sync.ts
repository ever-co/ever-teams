import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { projectRepositorySyncRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	if (req.method !== 'POST') {
		return $res.status(405).json({});
	}

	const response = await projectRepositorySyncRequest(
		{
			...req.body,
			tenantId,
			organizationId
		},
		access_token
	);

	return $res.status(200).json(response);
}

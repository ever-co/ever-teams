import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getIntegrationTenantRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { name } = req.query;

	if (req.method !== 'GET') {
		return $res.status(405).json({});
	}

	const response = await getIntegrationTenantRequest(
		{
			tenantId,
			organizationId,
			name: name as string
		},
		access_token
	);

	return $res.status(200).json(response);
}

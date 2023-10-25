import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { oAuthEndpointAuthorization } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { installation_id, setup_action, code } = req.body;

	if (req.method !== 'POST') {
		return $res.status(405).json({});
	}

	const response = await oAuthEndpointAuthorization(
		{
			tenantId,
			organizationId,
			installation_id,
			setup_action,
			code
		},
		access_token
	);

	return $res.status(200).json(response);
}

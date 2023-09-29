import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { installGitHubIntegration } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId, organizationId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const { installation_id, setup_action } = req.body;

	if (req.method !== 'POST') {
		return $res.status(405).json({});
	}

	await installGitHubIntegration(
		{
			tenantId,
			organizationId,
			installation_id,
			setup_action,
		},
		access_token
	);

	return;
}

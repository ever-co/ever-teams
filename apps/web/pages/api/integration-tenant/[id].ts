import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { deleteIntegrationTenantRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { id } = req.query;

	if (req.method !== 'DELETE') {
		return $res.status(405).json({});
	}

	if (id) {
		const response = await deleteIntegrationTenantRequest(id as string, tenantId, organizationId, access_token);

		return $res.status(200).json(response);
	}
}

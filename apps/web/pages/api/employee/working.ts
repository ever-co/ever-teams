import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getOrganizationEmployees } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId, organizationId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const { data } = await getOrganizationEmployees(
		access_token,
		tenantId,
		organizationId
	);

	$res.json(data);
}

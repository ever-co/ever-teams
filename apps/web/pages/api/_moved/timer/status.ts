import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getTimerStatusRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { data } = await getTimerStatusRequest({ tenantId, organizationId }, access_token);

	$res.json(data);
}

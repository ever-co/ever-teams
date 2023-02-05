import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getTaskSizesListRequest } from '@app/services/server/requests';
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
			return $res.json(await getTaskSizesListRequest(par, access_token));
	}
}

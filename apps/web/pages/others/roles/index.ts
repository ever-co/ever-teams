import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';

import { createRoleRequest, getRolesRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	switch (req.method) {
		case 'GET':
			return $res.json(
				(
					await getRolesRequest({
						bearer_token: access_token,
						tenantId
					})
				).data
			);
		case 'POST':
			return $res.json(
				(
					await createRoleRequest({
						bearer_token: access_token,
						tenantId,
						data: {
							...req.body,
							tenantId
						}
					})
				).data
			);
	}
}

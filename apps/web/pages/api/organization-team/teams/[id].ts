import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';

import { removeUserFromAllTeam } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(
		req,
		res
	);
	if (!user) return $res();

	const { id } = req.query;
	switch (req.method) {
		case 'DELETE':
			if (id) {
				return $res.json(
					await removeUserFromAllTeam({
						userId: id as string,
						bearer_token: access_token,
						tenantId,
					})
				);
			}
	}
}

import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';

import { resetUserRequest } from '@app/services/server/requests/user';
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

	switch (req.method) {
		case 'DELETE':
			return $res.json(
				await resetUserRequest({
					bearer_token: access_token,
					tenantId,
				})
			);
	}
}

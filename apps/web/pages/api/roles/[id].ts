import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	deleteRoleRequest,
	updateRoleRequest,
} from '@app/services/server/requests';
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

	if ((req.method !== 'DELETE' && req.method !== 'PUT') || !id) {
		return $res.status(405).json({});
	}

	switch (req.method) {
		case 'DELETE':
			return $res.json(
				await deleteRoleRequest({
					id: id as string,
					bearer_token: access_token,
					tenantId,
				})
			);

		case 'PUT':
			return $res.json(
				await updateRoleRequest({
					bearer_token: access_token,
					tenantId,
					data: req.body,
				})
			);
	}
}

import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getRolePermissionsRequest,
	updateRolePermissionRequest,
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

	if (!id) {
		return $res.status(405).json({});
	}

	switch (req.method) {
		case 'GET':
			return $res.json(
				(
					await getRolePermissionsRequest({
						bearer_token: access_token,
						tenantId,
						roleId: id as string,
					})
				).data
			);

		case 'PUT':
			return $res.json(
				(
					await updateRolePermissionRequest({
						bearer_token: access_token,
						tenantId,
						data: req.body,
					})
				).data
			);
	}
}

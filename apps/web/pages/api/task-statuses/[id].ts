import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { deleteTaskStatusRequest } from '@app/services/server/requests/taskStatus';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId, organizationId } =
		await authenticatedGuard(req, res);

	if (!user) return $res();

	const { id } = req.query;

	switch (req.method) {
		case 'DELETE':
			return $res.json(
				await deleteTaskStatusRequest({
					id,
					bearer_token: access_token,
					tenantId,
				})
			);
	}
}

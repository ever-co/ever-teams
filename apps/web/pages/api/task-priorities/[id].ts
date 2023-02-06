import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { deleteTaskPrioritiesRequest } from '@app/services/server/requests';
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
				await deleteTaskPrioritiesRequest({
					id,
					bearer_token: access_token,
					tenantId,
				})
			);
	}
}

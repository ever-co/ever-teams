import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getTaskRequest } from '@app/services/server/requests';
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
	let task;

	const { id: taskId } = req.query;

	switch (req.method) {
		case 'GET': {
			task = await getTaskRequest({
				taskId: taskId as string,
				tenantId,
				bearer_token: access_token,
			});
		}
	}

	return $res.status(200).json(task);
}

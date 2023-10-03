import { ITeamTask } from '@app/interfaces/ITask';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getTeamTasksRequest,
	updateTaskRequest
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, tenantId, access_token, organizationId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const { id: taskId } = req.query;
	const body = req.body as ITeamTask;

	delete body.selectedTeam;

	switch (req.method) {
		case 'PUT':
			await updateTaskRequest(
				{
					data: body,
					id: taskId as string
				},
				access_token
			);
			break;
	}

	const { data: tasks } = await getTeamTasksRequest({
		tenantId,
		organizationId,
		bearer_token: access_token
	});

	$res.status(200).json(tasks);
}

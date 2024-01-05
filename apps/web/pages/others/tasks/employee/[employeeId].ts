import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { deleteEmployeeFromTasksRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, tenantId, access_token: bearer_token } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { employeeId, organizationTeamId } = req.query as {
		employeeId: string;
		organizationTeamId: string;
	};

	switch (req.method) {
		case 'DELETE':
			$res.status(200).json(
				await deleteEmployeeFromTasksRequest({
					tenantId,
					employeeId,
					organizationTeamId,
					bearer_token
				})
			);
			break;
	}
}

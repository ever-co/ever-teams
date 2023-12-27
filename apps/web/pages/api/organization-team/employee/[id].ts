import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	addEmployeeOrganizationTeamOrderRequest,
	removeEmployeeOrganizationTeamRequest
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { id } = req.query;
	const order = req.body.order;

	if (!id) {
		return $res.status(405).json({});
	}

	switch (req.method) {
		case 'DELETE':
			await removeEmployeeOrganizationTeamRequest({
				bearer_token: access_token,
				tenantId,
				employeeId: id.toString()
			});
			break;
		case 'PUT':
			await addEmployeeOrganizationTeamOrderRequest({
				bearer_token: access_token,
				tenantId,
				employeeId: id.toString(),
				order,
				organizationTeamId: req.body.organizationTeamId,
				organizationId: req.body.organizationId
			});
			break;
	}

	// if (req.method !== 'DELETE' || !id) {
	// 	return $res.status(405).json({});
	// }

	// await removeEmployeeOrganizationTeamRequest({
	// 	bearer_token: access_token,
	// 	tenantId,
	// 	employeeId: id.toString()
	// });

	return;
}

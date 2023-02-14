import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { deleteOrganizationTeamEmployeeRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId, organizationId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const { id, employeeId } = req.query;

	switch (req.method) {
		case 'DELETE':
			if (id) {
				return $res.json(
					await deleteOrganizationTeamEmployeeRequest({
						id: id as string,
						bearer_token: access_token,
						tenantId,
						organizationId,
						employeeId: employeeId as string,
					})
				);
			}
	}
}

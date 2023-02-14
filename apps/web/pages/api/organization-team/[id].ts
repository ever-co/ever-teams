import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';

import {
	deleteOrganizationTeamRequest,
	getOrganizationTeamRequest,
	updateOrganizationTeamRequest,
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, organizationId, access_token, tenantId, teamId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const getTeamStatus = async () => {
		const { data: team } = await getOrganizationTeamRequest(
			{
				organizationId,
				tenantId,
				teamId: teamId,
			},
			access_token
		);

		return team;
	};

	const { id } = req.query;
	switch (req.method) {
		case 'GET':
			return $res.json(await getTeamStatus());

		case 'PUT':
			await updateOrganizationTeamRequest(req.body, access_token);
			return $res.json(await getTeamStatus());

		case 'DELETE':
			if (id) {
				return $res.json(
					await deleteOrganizationTeamRequest({
						id: id as string,
						bearer_token: access_token,
						tenantId,
						organizationId,
					})
				);
			}
	}
}

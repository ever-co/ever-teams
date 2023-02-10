import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
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

	switch (req.method) {
		case 'GET':
			const { data: teamStatus } = await getOrganizationTeamRequest(
				teamId,
				access_token,
				tenantId,
				{
					organizationId,
					'relations[0]': 'members',
					source: 'BROWSER',
					withLaskWorkedTask: 'true',
					tenantId,
				}
			);

			return $res.json(teamStatus);
		case 'PUT':
			return $res.json(
				await updateOrganizationTeamRequest(req.body, access_token)
			);
	}
}

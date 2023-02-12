import { IOrganizationTeamUpdate } from '@app/interfaces';
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

	/* Updating the team. */
	if (req.method === 'PUT') {
		const body = req.body as IOrganizationTeamUpdate;
		await updateOrganizationTeamRequest(body, access_token);
	}

	const { data: teamStatus } = await getOrganizationTeamRequest(
		{
			organizationId,
			tenantId,
			teamId: teamId,
		},
		access_token
	);

	return $res.json(teamStatus);
}

import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { getTeamInvitationsRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { data } = await getTeamInvitationsRequest(
		{
			tenantId,
			teamId,
			organizationId,
			role: 'EMPLOYEE'
		},
		access_token
	);

	$res.status(200).json(data);
}

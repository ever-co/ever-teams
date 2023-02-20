import { getPublicOrganizationTeamRequest } from '@app/services/server/requests/public-organization-team';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { profileLink, teamId }: { profileLink: string; teamId: string } =
		req.query as { profileLink: string; teamId: string };

	switch (req.method) {
		case 'GET':
			return res.json(
				await getPublicOrganizationTeamRequest({
					profileLink: profileLink,
					teamId,
				})
			);
	}
}

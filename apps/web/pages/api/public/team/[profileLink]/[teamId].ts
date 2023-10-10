import {
	getPublicOrganizationTeamMiscDataRequest,
	getPublicOrganizationTeamRequest
} from '@app/services/server/requests/public-organization-team';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const {
		profileLink,
		teamId,
		type
	}: { profileLink: string; teamId: string; type: string } = req.query as {
		profileLink: string;
		teamId: string;
		type: string;
	};

	switch (req.method) {
		case 'GET':
			if (type === 'misc') {
				return res.json(
					await getPublicOrganizationTeamMiscDataRequest({
						profileLink: profileLink,
						teamId
					})
				);
			}
			return res.json(
				await getPublicOrganizationTeamRequest({
					profileLink: profileLink,
					teamId
				})
			);
	}
}

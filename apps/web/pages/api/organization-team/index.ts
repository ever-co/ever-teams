import { IUserOrganization } from '@app/interfaces/IOrganization';
import { IOrganizationTeamList } from '@app/interfaces/IOrganizationTeam';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	createOrganizationTeamRequest,
	getAllOrganizationTeamRequest,
	getUserOrganizationsRequest
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);

	if (!user) return $res();

	if (req.method === 'POST') {
		const body = req.body as { name?: string };
		const $name = body.name?.trim() || '';
		if ($name.trim().length < 2) {
			return res.status(400).json({ errors: { name: 'Invalid team name !' } });
		}
		await createOrganizationTeamRequest(
			{
				name: $name,
				tenantId,
				organizationId,
				managerIds: user?.employee?.id ? [user.employee.id] : [],
				public: true // By default team should be public
			},
			access_token
		);
	}

	const { data: organizations } = await getUserOrganizationsRequest({ tenantId, userId: user.id }, access_token);

	const organizationsItems = organizations.items;

	const filteredOrganization = organizationsItems.reduce((acc, org) => {
		if (!acc.find((o) => o.organizationId === org.organizationId)) {
			acc.push(org);
		}
		return acc;
	}, [] as IUserOrganization[]);

	const call_teams = filteredOrganization.map((item) => {
		return getAllOrganizationTeamRequest({ tenantId, organizationId: item.organizationId }, access_token);
	});

	const teams = await Promise.all(call_teams).then((tms) => {
		return tms.reduce(
			(acc, { data }) => {
				acc.items.push(...data.items);
				acc.total += data.total;
				return acc;
			},
			{ items: [] as IOrganizationTeamList[], total: 0 }
		);
	});

	return $res.json(teams);
}

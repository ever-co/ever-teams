import { authFormValidate } from '@app/helpers/validations';
import { NextApiRequest, NextApiResponse } from 'next';
import {
	getAllOrganizationTeamRequest,
	getUserOrganizationsRequest,
	signInWorkspaceRequest,
} from '@app/services/server/requests';
import { setAuthCookies, setNoTeamPopupShowCookie } from '@app/helpers';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ status: 'fail' });
	}

	const body = req.body as { email: string; token: string };

	const { errors, valid: formValid } = authFormValidate(['email'], body as any);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	const { data } = await signInWorkspaceRequest(body.email, body.token);

	/**
	 * Get the first team from first organization
	 */
	const tenantId = data.user?.tenantId || '';
	const access_token = data.token;
	const userId = data.user?.id;

	const { data: organizations } = await getUserOrganizationsRequest(
		{ tenantId, userId },
		access_token
	);

	const organization = organizations?.items[0];

	if (!organization) {
		return res.status(400).json({
			errors: {
				email:
					'Your account is not yet ready to be used on the Ever Teams Platform',
			},
		});
	}

	const { data: teams } = await getAllOrganizationTeamRequest(
		{ tenantId, organizationId: organization.organizationId },
		access_token
	);

	const team = teams.items[0];

	if (!team) {
		setNoTeamPopupShowCookie(true);
		// No need to check now if user is in any Team or not, as we are allowing to login and then user can Join/Create new Team
		// return res.status(400).json({
		// 	errors: {
		// 		email: "We couldn't find any teams associated to this account",
		// 	},
		// });
	}

	setAuthCookies(
		{
			access_token: data.token,
			refresh_token: {
				token: data.refresh_token,
			},
			teamId: team?.id,
			tenantId,
			organizationId: organization?.organizationId,
			languageId: 'en', // TODO: not sure what should be here
			noTeamPopup: true,
			userId,
		},
		req,
		res
	);

	res.status(200).json({ team, loginResponse: data });
}

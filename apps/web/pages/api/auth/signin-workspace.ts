import { authFormValidate } from '@app/helpers/validations';
import { NextApiRequest, NextApiResponse } from 'next';
import {
	getUserOrganizationsRequest,
	signInWorkspaceRequest,
} from '@app/services/server/requests';
import { setAuthCookies } from '@app/helpers';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ status: 'fail' });
	}

	const body = req.body as { email: string; token: string; teamId: string };

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

	setAuthCookies(
		{
			access_token: data.token,
			refresh_token: {
				token: data.refresh_token,
			},
			teamId: body.teamId,
			tenantId,
			organizationId: organization?.organizationId,
			languageId: 'en', // TODO: not sure what should be here
			noTeamPopup: true,
			userId,
		},
		req,
		res
	);

	res.status(200).json({ loginResponse: data });
}

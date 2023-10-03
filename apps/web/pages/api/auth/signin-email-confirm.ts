import {
	generateToken,
	setAuthCookies,
	setNoTeamPopupShowCookie
} from '@app/helpers';
import { authFormValidate } from '@app/helpers/validations';
import { ILoginResponse } from '@app/interfaces';
import {
	acceptInviteRequest,
	getAllOrganizationTeamRequest,
	getUserOrganizationsRequest,
	signInEmailConfirmRequest,
	verifyInviteCodeRequest
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ status: 'fail' });
	}

	const body = req.body as { email: string; code: string };
	let loginResponse: ILoginResponse | null = null;

	const { errors, valid: formValid } = authFormValidate(
		['email', 'code'],
		body as any
	);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	// Accept Invite Flow Start
	/**
	 * Verify first if match with invite code
	 */
	const inviteReq = await verifyInviteCodeRequest({
		email: body.email,
		code: body.code
	}).catch(() => void 0);

	// General a random password with 8 chars
	if (inviteReq && inviteReq.data.fullName) {
		const password = generateToken(8);
		console.log('inviteReq', inviteReq.data);

		const names = inviteReq.data.fullName.split(' ');
		const acceptInviteRes = await acceptInviteRequest({
			code: body.code,
			email: body.email,
			password: password,
			user: {
				firstName: names[0],
				lastName: names[1] || '',
				email: body.email
			}
		}).catch(() => void 0);

		if (
			!acceptInviteRes ||
			!acceptInviteRes.response.ok ||
			acceptInviteRes.response.status === 401 ||
			acceptInviteRes.response.status === 400 ||
			(acceptInviteRes.data as any).response?.statusCode
		) {
			return res.status(400).json({
				errors: {
					email: 'Authentication code or email address invalid'
				}
			});
		}
		loginResponse = acceptInviteRes.data;

		if (!loginResponse) {
			return res.status(400).json({
				errors: {
					email: 'Authentication code or email address invalid'
				}
			});
		}
	}
	if (loginResponse) {
		console.log('loginResponse>>>', loginResponse);

		/**
		 * Get the first team from first organization
		 */
		const tenantId = loginResponse.user?.tenantId || '';
		const access_token = loginResponse.token;
		const userId = loginResponse.user?.id;

		const { data: organizations } = await getUserOrganizationsRequest(
			{ tenantId, userId },
			access_token
		);
		const organization = organizations?.items[0];

		if (!organization) {
			return res.status(400).json({
				errors: {
					email:
						'Your account is not yet ready to be used on the Ever Teams Platform'
				}
			});
		}
		const { data: teams } = await getAllOrganizationTeamRequest(
			{ tenantId, organizationId: organization.organizationId },
			access_token
		);

		const team = teams.items[0];
		if (!team) {
			setNoTeamPopupShowCookie(true);
		}
		setAuthCookies(
			{
				access_token: loginResponse.token,
				refresh_token: {
					token: loginResponse.refresh_token
				},
				teamId: team?.id,
				tenantId,
				organizationId: organization?.organizationId,
				languageId: 'en', // TODO: not sure what should be here
				noTeamPopup: true,
				userId
			},
			req,
			res
		);
		return res.status(200).json({ team, loginResponse });
	}
	// Accept Invite Flow End

	const { data } = await signInEmailConfirmRequest({
		code: body.code,
		email: body.email
	});

	res.json(data);
}

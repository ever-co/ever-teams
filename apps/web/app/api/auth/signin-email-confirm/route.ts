import { generateToken, setAuthCookies, setNoTeamPopupShowCookie } from '@/core/lib/helpers/index';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { ILoginResponse } from '@/core/types/interfaces/to-review';
import {
	acceptInviteRequest,
	getAllOrganizationTeamRequest,
	getUserOrganizationsRequest,
	signInEmailConfirmRequest,
	verifyInviteCodeRequest
} from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();

	const body = (await req.json()) as unknown as { email: string; code: string };
	let loginResponse: ILoginResponse | null = null;

	const { errors, valid: formValid } = authFormValidate(['email', 'code'], body as any);

	if (!formValid) {
		return NextResponse.json({ errors }, { status: 400 });
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
			(acceptInviteRes?.data as any).response?.statusCode
		) {
			return NextResponse.json(
				{
					errors: {
						email: 'Authentication code or email address invalid'
					}
				},
				{ status: 400 }
			);
		}

		loginResponse = acceptInviteRes.data;

		if (!loginResponse) {
			return NextResponse.json(
				{
					errors: {
						email: 'Authentication code or email address invalid'
					}
				},
				{ status: 400 }
			);
		}
	}

	// Login from Invitation
	if (loginResponse) {
		console.log('loginResponse>>>', loginResponse);

		/**
		 * Get the first team from first organization
		 */
		const tenantId = loginResponse.user?.tenantId || '';
		const access_token = loginResponse.token;
		const userId = loginResponse.user?.id;

		const { data: organizations } = await getUserOrganizationsRequest({ tenantId, userId }, access_token);
		const organization = organizations?.items[0];

		if (!organization) {
			return NextResponse.json(
				{
					errors: {
						email: 'Your account is not yet ready to be used on the Ever Teams Platform'
					}
				},
				{ status: 400 }
			);
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
			{ req, res }
		);

		return NextResponse.json({ team, loginResponse });
	}

	// Accept Invite Flow End
	const { data } = await signInEmailConfirmRequest({
		code: body.code,
		email: body.email
	});

	return NextResponse.json(data);
}

import { setAuthCookies, setNoTeamPopupShowCookie } from '@/core/lib/helpers/cookies';
import { generateToken } from '@/core/lib/helpers/generate-token';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { ILoginDataAPI, ILoginResponse as ILoginResponse } from '@/core/types/interfaces/IAuthentication';
import {
	acceptInviteRequest,
	getAllOrganizationTeamRequest,
	getUserOrganizationsRequest,
	verifyAuthCodeRequest,
	verifyInviteCodeRequest
} from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const body = (await req.json()) as unknown as ILoginDataAPI;
	let loginResponse: ILoginResponse | null = null;

	const { errors, valid: formValid } = authFormValidate(['email', 'code'], body as any);

	if (!formValid) {
		return NextResponse.json({ errors });
	}

	/**
	 * Verify first if matches with invite code
	 */
	const inviteReq = await verifyInviteCodeRequest({
		email: body.email,
		code: body.code
	}).catch(() => void 0);
	/**
	 * If the invite code verification failed then try again with the Auth code
	 */
	if (!inviteReq || !inviteReq.response.ok || (inviteReq.data as any).response?.statusCode) {
		try {
			const authReq = await verifyAuthCodeRequest(body.email, body.code);
			if (
				!authReq.response.ok ||
				(authReq.data as any).status === 404 ||
				(authReq.data as any).status === 400 ||
				(authReq.data as any).status === 401
			) {
				return NextResponse.json({
					errors: {
						email: 'Authentication code or email address invalid'
					}
				});
			}

			loginResponse = authReq.data;
		} catch (error) {
			// return notFound(res);
			return NextResponse.json({
				errors: {
					email: 'Authentication code or email address invalid'
				}
			});
		}

		/**
		 * If the provided code is an invite code and
		 * verified then accept and register the related user
		 */
	} else {
		// General a random password with 8 chars
		const password = generateToken(8);
		const names = inviteReq.data.fullName.split(' ');
		const acceptInviteRes = await acceptInviteRequest({
			code: body.code,
			email: inviteReq.data.email,
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
			return NextResponse.json({
				errors: {
					email: 'Authentication code or email address invalid'
				}
			});
		}

		loginResponse = acceptInviteRes.data;
	}

	if (!loginResponse) {
		return NextResponse.json({
			errors: {
				email: 'Authentication code or email address invalid'
			}
		});
	}

	/**
	 * Get the first team from the first organization
	 */
	const tenantId = loginResponse.user?.tenantId || '';
	const access_token = loginResponse.token;
	const userId = loginResponse.user?.id;

	const { data: organizations } = await getUserOrganizationsRequest({ tenantId, userId }, access_token);

	const organization = organizations?.items[0];

	if (!organization) {
		return NextResponse.json({
			errors: {
				email: 'Your account is not yet ready to be used on the Ever Teams Platform'
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
		{ req, res }
	);

	return NextResponse.json({ team, loginResponse });
}

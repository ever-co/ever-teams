/* eslint-disable no-void */
import generateSecureToken from '../../../../helpers/generate-secure-token';
import { authFormValidate } from '../../../../helpers/validations';
import { ILoginDataAPI, ILoginResponse } from '../../../interfaces/IAuthentication';
import { loginUserRequest, verifyAuthCodeRequest } from '../../requests/auth';
import { acceptInviteRequest, verifyInviteCodeRequest } from '../../requests/invite';
import { getUserOrganizationsRequest } from '../../requests/organization';
import { getAllOrganizationTeamRequest } from '../../requests/organization-team';

export async function login(params: ILoginDataAPI) {
	let loginResponse: ILoginResponse | null = null;

	const { errors, valid: formValid } = authFormValidate(['email', 'code'], params as any);

	if (!formValid) {
		return {
			response: {
				status: 400,
				errors
			}
		};
	}

	/**
	 * Verify first if match with invite code
	 */
	const inviteResponse = await verifyInviteCodeRequest({
		email: params.email,
		code: params.code
	}).catch(() => void 0);

	if (!inviteResponse || !inviteResponse.response.ok || (inviteResponse.data as any).response?.statusCode) {
		/**
		 * If the invite code verification failed then try again with auth code
		 */
		const authReq = await verifyAuthCodeRequest(params.email, params.code).catch(() => void 0);

		if (
			!authReq ||
			!authReq.response.ok ||
			(authReq.data as any).status === 404 ||
			(authReq.data as any).status === 400 ||
			(authReq.data as any).status === 401
		) {
			return {
				status: 400,
				errors: {
					email: 'Authentication code or email address invalid'
				}
			};
		}

		loginResponse = authReq.data;
		/**
		 * If provided code is an invite code and
		 * verified the accepte and register the related user
		 */
	} else {
		// generate a random password
		const password = '123456' + await generateSecureToken(6);
		const email = inviteResponse.data.email;
		const names = inviteResponse.data.fullName.split(' ');

		const acceptInviteRes = await acceptInviteRequest({
			user: {
				firstName: names[0],
				lastName: names[1] || '',
				name: inviteResponse.data.fullName,
				email
			},
			password,
			code: params.code,
			email: params.email
		}).catch(() => void 0);

		if (
			!acceptInviteRes ||
			!acceptInviteRes.response.ok ||
			acceptInviteRes.response.status === 401 ||
			acceptInviteRes.response.status === 400 ||
			(acceptInviteRes.data as any).response?.statusCode
		) {
			return {
				response: {
					status: 400,
					errors: {
						email: 'Authentication code or email address invalid'
					}
				}
			};
		}
		const { data: loginRes } = await loginUserRequest(email, password);
		loginResponse = loginRes;
	}

	if (!loginResponse) {
		return {
			status: 400,
			errors: {
				email: 'Authentication code or email address invalid'
			}
		};
	}

	/**
	 * Get the first team from first organization
	 */

	const tenantId = loginResponse.user.tenantId || '';
	const accessToken = loginResponse.token;
	const userId = loginResponse.user.id;

	const { data: organizations } = await getUserOrganizationsRequest({ tenantId, userId }, accessToken);

	const organization = organizations?.items[0];

	if (!organization) {
		return {
			response: {
				status: 400,
				errors: {
					email: 'Your account isn’t fully set up yet'
				}
			}
		};
	}

	const { data: teams } = await getAllOrganizationTeamRequest(
		{ tenantId, organizationId: organization.organizationId },
		accessToken
	);

	const team = teams.items[0];
	const noTeam = !team;

	// if (!team) {
	// 	// No need to check now if user is in any Team or not, as we are allowing to login and then user can Join/Create new Team
	// 	// return res.status(400).json({
	// 	// 	errors: {
	// 	// 		email: "We couldn't find any teams associated to this account",
	// 	// 	},
	// 	// });
	// }

	return {
		response: {
			data: {
				team,
				loginResponse,
				authStoreData: {
					access_token: loginResponse.token,
					refresh_token: {
						token: loginResponse.refresh_token
					},
					tenantId,
					organizationId: organization.organizationId
				},
				noTeam
			}
		},
		status: 200
	};
}

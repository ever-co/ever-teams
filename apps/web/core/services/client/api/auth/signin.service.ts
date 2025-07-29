import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';

import { authFormValidate } from '@/core/lib/helpers/validations';
import { generateToken } from '@/core/lib/helpers/generate-token';
import { AxiosResponse } from 'axios';
import { setAuthCookies, setNoTeamPopupShowCookie } from '@/core/lib/helpers/cookies';

import { inviteService } from '../organizations/teams/invites';
import { userOrganizationService } from '../users/user-organization.service';
import { organizationTeamService } from '../organizations/teams';
import { IAuthResponse, ISigninEmailConfirmResponse, ISigninWorkspaceInput } from '@/core/types/interfaces/auth/auth';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';
import { TOrganizationTeam } from '@/core/types/schemas';

class SigninService extends APIService {
	signInEmailConfirm = async (data: { code: string; email: string }) => {
		const { code, email } = data;
		return this.post<ISigninEmailConfirmResponse>('/auth/signin.email/confirm', {
			code,
			email,
			includeTeams: true
		});
	};

	signInEmailCodeConfirmGauzy = async (email: string, code: string) => {
		let loginResponse: IAuthResponse | null = null;

		const { errors, valid: formValid } = authFormValidate(['email', 'code'], { email, code } as any);

		if (!formValid) {
			return Promise.reject({ errors });
		}

		const inviteReq = await inviteService.validateInvitebyCodeAndEmail({ email, code });

		if (inviteReq && inviteReq.fullName) {
			const password = generateToken(8);
			const names = inviteReq.fullName.split(' ');

			const acceptInviteRes = await inviteService.acceptInvite({
				code,
				email,
				password,
				user: {
					firstName: names[0],
					lastName: names[1] || '',
					email
				}
			});

			if (!acceptInviteRes) {
				return Promise.reject({
					errors: {
						email: 'Authentication code or email address invalid'
					}
				});
			}

			loginResponse = acceptInviteRes;
		}

		if (loginResponse) {
			/**
			 * Get the first team from first organization
			 */
			const tenantId = loginResponse.user?.tenantId || '';
			const access_token = loginResponse.token;
			const userId = loginResponse.user?.id;

			const { data: organizations } = await userOrganizationService.getUserOrganizations({
				tenantId,
				userId,
				token: access_token
			});
			const organization = organizations?.items[0];

			if (!organization) {
				return Promise.reject({
					errors: {
						email: 'Your account is not yet ready to be used on the Ever Teams Platform'
					}
				});
			}

			const { data: teams } = await organizationTeamService.getAllOrganizationTeam(
				{ tenantId, organizationId: organization.organizationId || '' },
				access_token
			);

			const team = teams.items[0];
			if (!team) {
				setNoTeamPopupShowCookie(true);
			}

			setAuthCookies({
				access_token: loginResponse.token,
				refresh_token: {
					token: loginResponse.refresh_token
				},
				teamId: team?.id,
				tenantId,
				organizationId: organization?.organizationId || '',
				languageId: 'en', // TODO: not sure what should be here
				noTeamPopup: true,
				userId
			});

			const response: AxiosResponse<{ loginResponse: IAuthResponse; team: TOrganizationTeam }> = {
				data: { team, loginResponse },
				status: 200,
				statusText: '',
				headers: {},
				config: {} as any
			};

			return Promise.resolve(response);
		}

		return loginResponse;
	};

	signInWorkspace = async (input: ISigninWorkspaceInput) => {
		const res = await this.post<IAuthResponse>('/auth/signin.workspace', input);
		return res.data;
	};

	/**
	 *
	 * @param email
	 * @param code
	 * @returns
	 */
	signInEmailConfirmGauzy = async (email: string, code: string) => {
		let loginResponse;

		try {
			loginResponse = await this.signInEmailCodeConfirmGauzy(email, code);
		} catch (error) {
			console.error('Error in signInEmailCodeConfirmation:', error);
			throw error;
		}

		if (loginResponse) {
			return loginResponse;
		}

		try {
			const signinResponse = await this.signInEmailConfirm({ email, code });
			return signinResponse;
		} catch (error) {
			return Promise.reject(error);
		}
	};

	/**
	 * @param params
	 */
	signInWorkspaceGauzy = async (params: {
		email: string;
		token: string;
		teamId: string;
		code?: string;
		defaultTeamId?: IOrganizationTeam['id'];
		lastTeamId?: IOrganizationTeam['id'];
	}) => {
		if (params.code) {
			let loginResponse;
			try {
				loginResponse = await this.signInEmailCodeConfirmGauzy(params.email, params.code);
			} catch (error) {
				console.error('Error in signInWorkspaces', error);
				throw error;
			}

			if (loginResponse) {
				return loginResponse;
			}
		}

		const data = await this.signInWorkspace({
			email: params.email,
			token: params.token,
			defaultTeamId: params.defaultTeamId,
			lastTeamId: params.lastTeamId
		});

		/**
		 * Get the first team from first organization
		 */
		const tenantId = data.user?.tenantId || '';
		const access_token = data.token;
		const userId = data.user?.id;

		const { data: organizations } = await userOrganizationService.getUserOrganizations({
			tenantId,
			userId,
			token: access_token
		});

		const organization = organizations?.items[0];

		if (!organization) {
			return Promise.reject({
				errors: {
					email: 'Your account is not yet ready to be used on the Ever Teams Platform'
				}
			});
		}

		setAuthCookies({
			access_token: data.token,
			refresh_token: {
				token: data.refresh_token
			},
			teamId: params.teamId,
			tenantId,
			organizationId: organization?.organizationId || '',
			languageId: 'en', // TODO: not sure what should be here
			noTeamPopup: true,
			userId
		});

		const response: AxiosResponse<{ loginResponse: IAuthResponse }> = {
			data: { loginResponse: data },
			status: 200,
			statusText: '',
			headers: {},
			config: {} as any
		};

		return Promise.resolve(response);
	};
}

export const signinService = new SigninService(GAUZY_API_BASE_SERVER_URL.value);

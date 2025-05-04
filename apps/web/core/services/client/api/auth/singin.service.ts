import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import {
	IInviteVerified,
	IInviteVerifyCode,
	ILoginResponse,
	IOrganizationTeam,
	IOrganizationTeamList,
	ISigninEmailConfirmResponse,
	ISigninWorkspaceInput,
	ITeamRequestParams,
	IUserOrganization,
	PaginationResponse,
	TimerSource
} from '@/core/types/interfaces';
import { authFormValidate } from '@/core/lib/helpers/validations';
import { generateToken } from '@/core/lib/helpers/generate-token';
import { AxiosResponse } from 'axios';
import { setAuthCookies, setNoTeamPopupShowCookie } from '@/core/lib/helpers/cookies';
import { AcceptInviteParams } from '@/core/services/server/requests';
import qs from 'qs';

class SinginService extends APIService {
	acceptInvite = async (params: AcceptInviteParams) => {
		try {
			const res = await this.post<ILoginResponse>('/invite/accept', params);
			return res.data;
		} catch {
			return void 0;
		}
	};

	verifyInviteCode = async (params: IInviteVerifyCode) => {
		const res = await this.post<IInviteVerified>('/invite/validate-by-code', params);
		return res.data;
	};

	/**
	 * Constructs a request to fetch user organizations with tenant and user ID.
	 *
	 * @param params - Parameters including tenantId, userId, and token for authentication.
	 * @returns A promise that resolves to a pagination response of user organizations.
	 */
	getUserOrganizations = async (params: { tenantId: string; userId: string; token: string }) => {
		// Create a new instance of URLSearchParams for query string construction
		const query = new URLSearchParams();

		// Add user and tenant IDs to the query
		query.append('where[userId]', params.userId);
		query.append('where[tenantId]', params.tenantId);

		// If there are relations, add them to the query
		const relations: string[] = [];
		// Append each relation to the query string
		relations.forEach((relation, index) => {
			query.append(`relations[${index}]`, relation);
		});

		return this.get<PaginationResponse<IUserOrganization>>(`/user-organization?${query.toString()}`, {
			tenantId: params.tenantId,
			headers: {
				Authorization: `Bearer ${params.token}`
			}
		});
	};

	/**
	 * Fetches a list of all teams within an organization, including specified relation data.
	 *
	 * @param {ITeamRequestParams} params Parameters for the team request, including organization and tenant IDs, and optional relations.
	 * @param {string} bearer_token The bearer token for authentication.
	 * @returns A Promise resolving to the pagination response of organization teams.
	 */
	getAllOrganizationTeam = async (params: ITeamRequestParams, bearer_token: string) => {
		const relations = params.relations || [
			'members',
			'members.role',
			'members.employee',
			'members.employee.user',
			'createdByUser',
			'projects',
			'projects.customFields.repository'
		];

		// Construct search queries
		const queryParams = {
			'where[organizationId]': params.organizationId,
			'where[tenantId]': params.tenantId,
			source: TimerSource.TEAMS,
			withLastWorkedTask: 'true', // Corrected the typo here
			...Object.fromEntries(relations.map((relation, index) => [`relations[${index}]`, relation]))
		};

		// Serialize search queries into a query string
		const queryString = qs.stringify(queryParams, { arrayFormat: 'brackets' });

		// Construct and execute the request
		return this.get<PaginationResponse<IOrganizationTeamList>>(`/organization-team?${queryString}`, {
			tenantId: params.tenantId,
			headers: {
				Authorization: `Bearer ${bearer_token}`
			}
		});
	};

	signInEmailConfirm = async (data: { code: string; email: string }) => {
		const { code, email } = data;
		return this.post<ISigninEmailConfirmResponse>('/auth/signin.email/confirm', {
			code,
			email,
			includeTeams: true
		});
	};

	signInEmailCodeConfirmGauzy = async (email: string, code: string) => {
		let loginResponse: ILoginResponse | null = null;

		const { errors, valid: formValid } = authFormValidate(['email', 'code'], { email, code } as any);

		if (!formValid) {
			return Promise.reject({ errors });
		}

		const inviteReq = await this.verifyInviteCode({ email, code });

		if (inviteReq && inviteReq.fullName) {
			const password = generateToken(8);
			const names = inviteReq.fullName.split(' ');

			const acceptInviteRes = await this.acceptInvite({
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

			const { data: organizations } = await this.getUserOrganizations({
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

			const { data: teams } = await this.getAllOrganizationTeam(
				{ tenantId, organizationId: organization.organizationId },
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
				organizationId: organization?.organizationId,
				languageId: 'en', // TODO: not sure what should be here
				noTeamPopup: true,
				userId
			});

			const response: AxiosResponse<{ loginResponse: ILoginResponse; team: IOrganizationTeamList }> = {
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
		const res = await this.post<ILoginResponse>('/auth/signin.workspace', input);
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

		const { data: organizations } = await this.getUserOrganizations({
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
			organizationId: organization?.organizationId,
			languageId: 'en', // TODO: not sure what should be here
			noTeamPopup: true,
			userId
		});

		const response: AxiosResponse<{ loginResponse: ILoginResponse }> = {
			data: { loginResponse: data },
			status: 200,
			statusText: '',
			headers: {},
			config: {} as any
		};

		return Promise.resolve(response);
	};
}

export const singinService = new SinginService(GAUZY_API_BASE_SERVER_URL.value);

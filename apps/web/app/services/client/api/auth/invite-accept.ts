import {
	ILoginResponse,
	IInviteVerifyCode,
	IInviteVerified,
	IUserOrganization,
	PaginationResponse,
	ITeamRequestParams,
	TimerSource,
	IOrganizationTeamList,
	ISigninEmailConfirmResponse
} from '@app/interfaces';
import { AcceptInviteParams } from '@app/services/server/requests';
import { get, post } from '../../axios';
import { authFormValidate, generateToken, setAuthCookies, setNoTeamPopupShowCookie } from '@app/helpers';
import qs from 'qs';
import { AxiosResponse } from 'axios';

export function acceptInviteAPI(params: AcceptInviteParams) {
	return post<ILoginResponse>('/invite/accept', params)
		.then((res) => res.data)
		.catch(() => void 0);
}

export function verifyInviteCodeAPI(params: IInviteVerifyCode) {
	return post<IInviteVerified>('/invite/validate-by-code', params).then((res) => res.data);
}

/**
 * Constructs a request to fetch user organizations with tenant and user ID.
 *
 * @param params - Parameters including tenantId, userId, and token for authentication.
 * @returns A promise that resolves to a pagination response of user organizations.
 */
export function getUserOrganizationsRequest(params: { tenantId: string; userId: string; token: string }) {
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

	return get<PaginationResponse<IUserOrganization>>(`/user-organization?${query.toString()}`, {
		tenantId: params.tenantId,
		headers: {
			Authorization: `Bearer ${params.token}`
		}
	});
}

/**
 * Fetches a list of all teams within an organization, including specified relation data.
 *
 * @param {ITeamRequestParams} params Parameters for the team request, including organization and tenant IDs, and optional relations.
 * @param {string} bearer_token The bearer token for authentication.
 * @returns A Promise resolving to the pagination response of organization teams.
 */
export function getAllOrganizationTeamAPI(params: ITeamRequestParams, bearer_token: string) {
	const relations = params.relations || [
		'members',
		'members.role',
		'members.employee',
		'members.employee.user',
		'createdBy',
		'projects',
		'projects.repository'
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
	return get<PaginationResponse<IOrganizationTeamList>>(`/organization-team?${queryString}`, {
		tenantId: params.tenantId,
		headers: {
			Authorization: `Bearer ${bearer_token}`
		}
	});
}

export const signInEmailConfirmAPI = (data: { code: string; email: string }) => {
	const { code, email } = data;
	return post<ISigninEmailConfirmResponse>('/auth/signin.email/confirm', { code, email, includeTeams: true });
};

export async function signInEmailCodeConfirmGauzy(email: string, code: string) {
	let loginResponse: ILoginResponse | null = null;

	const { errors, valid: formValid } = authFormValidate(['email', 'code'], { email, code } as any);

	if (!formValid) {
		return Promise.reject({ errors });
	}

	const inviteReq = await verifyInviteCodeAPI({ email, code });

	if (inviteReq && inviteReq.fullName) {
		const password = generateToken(8);
		const names = inviteReq.fullName.split(' ');

		const acceptInviteRes = await acceptInviteAPI({
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

		const { data: organizations } = await getUserOrganizationsRequest({ tenantId, userId, token: access_token });
		const organization = organizations?.items[0];

		if (!organization) {
			return Promise.reject({
				errors: {
					email: 'Your account is not yet ready to be used on the Ever Teams Platform'
				}
			});
		}

		const { data: teams } = await getAllOrganizationTeamAPI(
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
}

export function signInWorkspaceAPI(email: string, token: string) {
	return post<ILoginResponse>('/auth/signin.workspace', {
		email,
		token
	}).then((res) => res.data);
}

/**
 *
 * @param email
 * @param code
 * @returns
 */
export async function signInEmailConfirmGauzy(email: string, code: string) {
	const loginResponse = await signInEmailCodeConfirmGauzy(email, code);

	if (loginResponse) {
		return loginResponse;
	}

	return signInEmailConfirmAPI({ email, code });
}

/**
 * @param params
 */
export async function signInWorkspaceGauzy(params: { email: string; token: string; teamId: string; code?: string }) {
	if (params.code) {
		const loginResponse = await signInEmailCodeConfirmGauzy(params.email, params.code);

		if (loginResponse) {
			return loginResponse;
		}
	}

	const data = await signInWorkspaceAPI(params.email, params.token);

	/**
	 * Get the first team from first organization
	 */
	const tenantId = data.user?.tenantId || '';
	const access_token = data.token;
	const userId = data.user?.id;

	const { data: organizations } = await getUserOrganizationsRequest({ tenantId, userId, token: access_token });

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
}

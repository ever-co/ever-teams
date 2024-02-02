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

export function getUserOrganizationsRequest(params: { tenantId: string; userId: string; token: string }) {
	const query = JSON.stringify({
		relations: [],
		findInput: {
			userId: params.userId,
			tenantId: params.tenantId
		}
	});

	return get<PaginationResponse<IUserOrganization>>(`/user-organization?data=${encodeURIComponent(query)}`, {
		tenantId: params.tenantId,
		headers: {
			Authorization: `Bearer ${params.token}`
		}
	});
}

export function getAllOrganizationTeamAPI(params: ITeamRequestParams, bearer_token: string) {
	const relations = params.relations || [
		'members',
		'members.role',
		'members.employee',
		'members.employee.user',
		'createdBy',
		'createdBy.employee',
		'projects',
		'projects.repository'
	];

	const searchQueries = {
		'where[organizationId]': params.organizationId,
		'where[tenantId]': params.tenantId,
		source: TimerSource.TEAMS,
		withLaskWorkedTask: 'true'
	} as { [x: string]: string };

	relations.forEach((rl, i) => {
		searchQueries[`relations[${i}]`] = rl;
	});

	const query = qs.stringify(params);

	return get<PaginationResponse<IOrganizationTeamList>>(`/organization-team?${query}`, {
		tenantId: params.tenantId,
		headers: {
			Authorization: `Bearer ${bearer_token}`
		}
	});
}

export const signInEmailConfirmAPI = (data: { code: string; email: string }) => {
	const { code, email } = data;
	return post<ISigninEmailConfirmResponse>('/auth/signin.email/confirm?includeTeams=true', { code, email });
};

/**
 *
 * @param email
 * @param code
 * @returns
 */
export async function signInEmailConfirmGauzy(email: string, code: string) {
	let loginResponse: ILoginResponse | null = null;
	const inviteReq = await verifyInviteCodeAPI({ email, code });

	const { errors, valid: formValid } = authFormValidate(['email', 'code'], { email, code } as any);

	if (!formValid) {
		return Promise.reject({ errors });
	}

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

	return signInEmailConfirmAPI({ email, code });
}

import { PaginationResponse } from '@app/interfaces/IDataResponse';
import { IInvitation, MyInvitationActionEnum, IInviteCreate, IMyInvitations } from '@app/interfaces';
import { GAUZY_API_BASE_SERVER_URL, INVITE_CALLBACK_PATH, INVITE_CALLBACK_URL } from '@app/constants';
import { deleteApi, get, post, put } from '../axios';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';

interface IIInviteRequest {
	email: string;
	name: string;
	teamId: string;
	organizationId: string;
}

export async function inviteByEmailsAPI(data: IIInviteRequest, tenantId: string) {
	const endpoint = '/invite/emails';

	const date = new Date();
	date.setDate(date.getDate() - 1);

	const getRoleEndpoint = '/roles/options?name=EMPLOYEE';

	const employeeRole = await get<any>(getRoleEndpoint, { tenantId });

	const dataToInviteUser: IInviteCreate & { tenantId: string } = {
		emailIds: [data.email],
		projectIds: [],
		departmentIds: [],
		organizationContactIds: [],
		teamIds: [data.teamId],
		roleId: employeeRole.data.id || '',
		invitationExpirationPeriod: 'Never',
		inviteType: 'TEAM',
		appliedDate: null,
		fullName: data.name,
		callbackUrl: INVITE_CALLBACK_URL,
		organizationId: data.organizationId,
		tenantId,
		startedWorkOn: date.toISOString()
	};

	// for not direct call we need to adjust data to include name and email only

	return post<PaginationResponse<IInvitation>>(endpoint, dataToInviteUser, { tenantId });
}

export async function getTeamInvitationsAPI(tenantId: string, organizationId: string, role: string, teamId: string) {
	const query = new URLSearchParams({
		'where[tenantId]': tenantId,
		'where[organizationId]': organizationId,
		'where[role][name]': role,
		'where[teams][id][0]': teamId,
		'where[status]': 'INVITED'
	});

	const endpoint = `/invite?${query.toString()}`;

	return get<PaginationResponse<IInvitation>>(endpoint, { tenantId });
}

export async function removeTeamInvitationsAPI(
	invitationId: string,
	tenantId: string,
	organizationId: string,
	role: string,
	teamId: string
) {
	let response = await deleteApi<PaginationResponse<IInvitation>>(`/invite/${invitationId}`, { tenantId });

	if (GAUZY_API_BASE_SERVER_URL.value) {
		response = await getTeamInvitationsAPI(tenantId, organizationId, role, teamId);
	}

	return response;
}

export function resendTeamInvitationsAPI(inviteId: string) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();

	const callbackUrl = INVITE_CALLBACK_URL || `${window.location.origin}${INVITE_CALLBACK_PATH}`;

	const localData = {
		tenantId,
		inviteId,
		inviteType: 'TEAM',
		organizationId,
		callbackUrl: INVITE_CALLBACK_URL || callbackUrl
	};

	const nData = {
		inviteId
	};

	const data = GAUZY_API_BASE_SERVER_URL.value ? localData : nData;

	return post<PaginationResponse<IInvitation>>(`/invite/resend`, data);
}

export async function getMyInvitationsAPI(tenantId: string) {
	const endpoint = '/invite/me';

	return get<PaginationResponse<IMyInvitations>>(endpoint, { tenantId });
}

export function acceptRejectMyInvitationsAPI(invitationId: string, action: MyInvitationActionEnum) {
	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/invite/${invitationId}/${action}`
		: `/invite/${invitationId}?action=${action}`;

	return put<IInvitation & { message?: string }>(endpoint);
}

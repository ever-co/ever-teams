import { PaginationResponse } from '@app/interfaces/IDataResponse';
import { IInvitation, MyInvitationActionEnum, CreateResponse, IInviteCreate, IMyInvitations } from '@app/interfaces';
import { INVITE_CALLBACK_URL } from '@app/constants';
import api, { get, post } from '../axios';

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

export function removeTeamInvitationsAPI(invitationId: string) {
	return api.delete<PaginationResponse<IInvitation>>(`/invite/${invitationId}`);
}

export function resendTeamInvitationsAPI(inviteId: string) {
	return api.post<any>(`/invite/resend`, {
		inviteId
	});
}

export async function getMyInvitationsAPI(tenantId: string) {
	const endpoint = '/invite/me';

	return get<PaginationResponse<IMyInvitations>>(endpoint, { tenantId });
}

export function acceptRejectMyInvitationsAPI(invitationId: string, action: MyInvitationActionEnum) {
	return api.put<CreateResponse<IInvitation>>(`/invite/${invitationId}?action=${action}`);
}

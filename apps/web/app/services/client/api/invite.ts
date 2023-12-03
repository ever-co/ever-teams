import { PaginationResponse } from '@app/interfaces/IDataResponse';
import { IInvitation, IInviteRequest, MyInvitationActionEnum, CreateResponse } from '@app/interfaces';
import api, { get, post } from '../axios';

// export function inviteByEmailsAPI(data: IInviteRequest) {
// 	return api.post<PaginationResponse<IInvitation>>('/invite/emails', data);
// }

export async function inviteByEmailsAPI(data: IInviteRequest, tenantId: string) {
	const endpoint = '/invite/emails';

	return await post(endpoint, data, false, { tenantId });
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
	const data = await get(endpoint, true, { tenantId });

	return process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL ? data.data : data;
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
	const data = await get(endpoint, true, { tenantId });

	return process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL ? data.data : data;
}

export function acceptRejectMyInvitationsAPI(invitationId: string, action: MyInvitationActionEnum) {
	return api.put<CreateResponse<IInvitation>>(`/invite/${invitationId}?action=${action}`);
}

import { PaginationResponse } from '@app/interfaces/IDataResponse';
import { IInvitation, IInviteRequest, IMyInvitations, MyInvitationActionEnum, CreateResponse } from '@app/interfaces';
import api, { get } from '../axios';

export function inviteByEmailsAPI(data: IInviteRequest) {
	return api.post<PaginationResponse<IInvitation>>('/invite/emails', data);
}

export function getTeamInvitationsAPI() {
	return api.get<PaginationResponse<IInvitation>>('/invite');
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

import { PaginationResponse } from '@app/interfaces/IDataResponse';
import { IInvitation, IInviteRequest } from '@app/interfaces/IInvite';
import api from '../axios';

export function inviteByEmailsAPI(data: IInviteRequest) {
	return api.post<PaginationResponse<IInvitation>>('/invite/emails', data);
}

export function getTeamInvitationsAPI() {
	return api.get<PaginationResponse<IInvitation>>('/invite');
}

export function removeTeamInvitationsAPI(invitationId: string) {
	return api.get<PaginationResponse<IInvitation>>(`/invite/${invitationId}`);
}

export function resendTeamInvitationsAPI(invitationId: string) {
	return api.post<PaginationResponse<IInvitation>>(`/invite/resend`, {
		invitationId,
	});
}

import { PaginationResponse } from '@app/interfaces/IDataResponse';
import {
	IInvitation,
	IInviteRequest,
	IMyInvitations,
} from '@app/interfaces/IInvite';
import api from '../axios';

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
		inviteId,
	});
}

export function getMyInvitationsAPI() {
	return api.get<PaginationResponse<IMyInvitations>>('/invite/me');
}

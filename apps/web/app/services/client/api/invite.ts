import { PaginationResponse } from '@app/interfaces/IDataResponse';
import {
	IInvitation,
	//  IInviteRequest,
	MyInvitationActionEnum,
	CreateResponse,
	IInviteCreate
} from '@app/interfaces';
import { INVITE_CALLBACK_URL } from '@app/constants';
import api, { get, post } from '../axios';
// import { getEmployeeRoleRequest } from '@app/services/server/requests';
// import { getCookie } from 'cookies-next';

// export function inviteByEmailsAPI(data: IInviteRequest) {
// 	return api.post<PaginationResponse<IInvitation>>('/invite/emails', data);
// }

interface IIInviteRequest {
	email: string;
	name: string;
	teamId: string;
	organizationId: string;
}

export async function inviteByEmailsAPI(data: IIInviteRequest, tenantId: string) {
	const endpoint = '/invite/emails';

	// const authToken = getCookie('auth-token')?.toString();

	const date = new Date();
	date.setDate(date.getDate() - 1);

	// console.log('authToken:', authToken);
	// console.log('tenantId:', tenantId);

	// const { data: employeeRole } = await getEmployeeRoleRequest({
	// 	tenantId,
	// 	role: 'EMPLOYEE',
	// 	bearer_token: authToken as string
	// });

	const dataToInviteUser: IInviteCreate = {
		emailIds: [data.email],
		projectIds: [],
		departmentIds: [],
		organizationContactIds: [],
		teamIds: [data.teamId],
		roleId: 'b1d702d9-9380-4cda-a442-0e7d1ca7480e' || '',
		invitationExpirationPeriod: 'Never',
		inviteType: 'TEAM',
		appliedDate: null,
		fullName: data.name,
		callbackUrl: INVITE_CALLBACK_URL,
		organizationId: data.organizationId,
		startedWorkOn: date.toISOString()
	};

	const fetchData = await post(endpoint, dataToInviteUser, true, { tenantId });

	return process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL ? fetchData.data : fetchData;
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

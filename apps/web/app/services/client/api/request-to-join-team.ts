import {
	IRequestToJoinCreate,
	IRequestToJoin,
	IDataResponse,
	ISuccessResponse,
	IValidateRequestToJoin,
	CreateResponse,
	PaginationResponse,
	IRequestToJoinActionEnum
} from '@app/interfaces';
import api, { get, post } from '../axios';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';

export function getRequestToJoinAPI() {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const query = new URLSearchParams({
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	});

	return get<PaginationResponse<IRequestToJoin>>(`/organization-team-join?${query.toString()}`);
}

export function requestToJoinAPI(data: IRequestToJoinCreate) {
	const endpoint = '/organization-team-join';
	return post<IRequestToJoin>(endpoint, data);
}

export function validateRequestToJoinAPI(data: IValidateRequestToJoin) {
	return api.post<CreateResponse<Pick<IRequestToJoin, 'email' | 'organizationTeamId'>>>(
		'/organization-team-join/validate',
		data
	);
}

export function resendCodeRequestToJoinAPI(data: IRequestToJoinCreate) {
	return api.post<IDataResponse<ISuccessResponse>>('/organization-team-join/resend-code', data);
}

export function acceptRejectRequestToJoinAPI(id: string, action: IRequestToJoinActionEnum) {
	return api.put<PaginationResponse<IRequestToJoin>>(`/organization-team-join/${id}/${action}`);
}

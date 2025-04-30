import {
	IRequestToJoinCreate,
	IRequestToJoin,
	IDataResponse,
	ISuccessResponse,
	IValidateRequestToJoin,
	PaginationResponse,
	IRequestToJoinActionEnum
} from '@/core/types/interfaces';
import { get, post, put } from '../axios';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import qs from 'qs';

export function getRequestToJoinAPI() {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const query = qs.stringify({
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	});

	return get<PaginationResponse<IRequestToJoin>>(`/organization-team-join?${query}`);
}

export function requestToJoinAPI(data: IRequestToJoinCreate) {
	const endpoint = '/organization-team-join';
	return post<IRequestToJoin>(endpoint, data);
}

export function validateRequestToJoinAPI(data: IValidateRequestToJoin) {
	return post<Pick<IRequestToJoin, 'email' | 'organizationTeamId'>>('/organization-team-join/validate', data);
}

export function resendCodeRequestToJoinAPI(data: IRequestToJoinCreate) {
	return post<IDataResponse<ISuccessResponse>>('/organization-team-join/resend-code', data);
}

export function acceptRejectRequestToJoinAPI(id: string, action: IRequestToJoinActionEnum) {
	return put<PaginationResponse<IRequestToJoin>>(`/organization-team-join/${id}/${action}`);
}

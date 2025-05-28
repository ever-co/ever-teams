import { IJoinTeamResponse, IValidateRequestToJoinTeam } from '@/core/types/interfaces/team/request-to-join';
import { IDataResponse, ISuccessResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IJoinTeamRequest } from '@/core/types/interfaces/team/request-to-join';
import { serverFetch } from '../fetch';
import qs from 'qs';
import { ERequestStatus } from '@/core/types/interfaces/enums';

/**
 * Request to Join Team request
 *
 * @param body
 * @returns
 */
export function requestToJoinRequest(body: IJoinTeamRequest) {
	return serverFetch<PaginationResponse<IJoinTeamResponse>>({
		path: '/organization-team-join',
		method: 'POST',
		body
	});
}

/**
 * Validate Request to Join Team request
 *
 * @param body
 * @returns
 */
export function validateRequestToJoinRequest(body: IValidateRequestToJoinTeam) {
	return serverFetch<PaginationResponse<Pick<IJoinTeamResponse, 'email' | 'organizationTeamId'>>>({
		path: '/organization-team-join/validate',
		method: 'POST',
		body
	});
}

/**
 * Validate Request to Join Team request
 *
 * @param body
 * @returns
 */
export function resendCodeRequestToJoinRequest(body: IJoinTeamRequest) {
	return serverFetch<IDataResponse<ISuccessResponse>>({
		path: '/organization-team-join/resend-code',
		method: 'POST',
		body
	});
}

/**
 * GET Request to Join Team request
 *
 * @param body
 * @returns
 */
export function getRequestToJoinRequest({
	bearer_token,
	tenantId,
	organizationId
}: {
	bearer_token: string | undefined;
	tenantId: string | undefined;
	organizationId: string | undefined;
}) {
	const params = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	} as { [x: string]: string };
	const query = qs.stringify(params);

	return serverFetch<PaginationResponse<IJoinTeamResponse>>({
		path: `/organization-team-join?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

/**
 * Accept/Reject Request to Join Team request
 *
 * @param body
 * @returns
 */
export function acceptRejectRequestToJoinRequest({
	bearer_token,
	tenantId,
	id,
	action
}: {
	bearer_token: string | undefined;
	tenantId: string | undefined;
	id: string;
	action: ERequestStatus;
}) {
	return serverFetch<IDataResponse<ISuccessResponse>>({
		path: `/organization-team-join/${id}/${action}`,
		method: 'PUT',
		tenantId,
		bearer_token
	});
}

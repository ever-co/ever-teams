import {
	IRequestToJoinCreate,
	IRequestToJoin,
	IDataResponse,
	PaginationResponse,
	ISuccessResponse,
	IValidateRequestToJoin,
	IRequestToJoinActionEnum,
} from '@app/interfaces';
import { serverFetch } from '../fetch';

/**
 * Request to Join Team request
 *
 * @param body
 * @returns
 */
export function requestToJoinRequest(body: IRequestToJoinCreate) {
	return serverFetch<PaginationResponse<IRequestToJoin>>({
		path: '/organization-team-join',
		method: 'POST',
		body,
	});
}

/**
 * Validate Request to Join Team request
 *
 * @param body
 * @returns
 */
export function validateRequestToJoinRequest(body: IValidateRequestToJoin) {
	return serverFetch<
		PaginationResponse<Pick<IRequestToJoin, 'email' | 'organizationTeamId'>>
	>({
		path: '/organization-team-join/validate',
		method: 'POST',
		body,
	});
}

/**
 * Validate Request to Join Team request
 *
 * @param body
 * @returns
 */
export function resendCodeRequestToJoinRequest(body: IRequestToJoinCreate) {
	return serverFetch<IDataResponse<ISuccessResponse>>({
		path: '/organization-team-join/resend-code',
		method: 'POST',
		body,
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
	organizationId,
}: {
	bearer_token: string | undefined;
	tenantId: string | undefined;
	organizationId: string | undefined;
}) {
	const params = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
	} as { [x: string]: string };
	const query = new URLSearchParams(params);

	return serverFetch<PaginationResponse<IRequestToJoin>>({
		path: `/organization-team-join?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId,
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
	action,
}: {
	bearer_token: string | undefined;
	tenantId: string | undefined;
	id: string;
	action: IRequestToJoinActionEnum;
}) {
	return serverFetch<IDataResponse<ISuccessResponse>>({
		path: `/organization-team-join/${id}/${action}`,
		method: 'PUT',
		tenantId,
		bearer_token,
	});
}

import {
	IRequestToJoinCreate,
	IRequestToJoin,
	IDataResponse,
	PaginationResponse,
	ISuccessResponse,
	IValidateRequestToJoin,
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

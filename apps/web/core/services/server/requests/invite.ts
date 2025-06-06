import { IAuthResponse } from '@/core/types/interfaces/auth/auth';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IInviteVerified, IInviteVerifyCode } from '@/core/types/interfaces/user/invite';
import { IInviteCreate } from '@/core/types/interfaces/user/invite';
import { serverFetch } from '../fetch';
import qs from 'qs';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { TInvite } from '@/core/types/schemas';

/**
 * Invite user using email request
 *
 * @param body
 * @param bearer_token
 * @returns
 */
export function inviteByEmailsRequest(
	{ tenantId, ...body }: IInviteCreate & { tenantId: string },
	bearer_token: string
) {
	return serverFetch<PaginationResponse<TInvite>>({
		path: '/invite/emails',
		method: 'POST',
		body,
		bearer_token,
		tenantId
	});
}

/**
 * Delete invite record
 *
 * @param param0
 * @returns
 */
export function removeTeamInvitationsRequest({
	invitationId,
	bearer_token,
	tenantId
}: {
	invitationId: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<any>({
		path: `/invite/${invitationId}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

type ITeamInvitationsRequest = {
	tenantId: string;
	organizationId: string;
	role: 'EMPLOYEE';
	teamId: string;
};

/**
 * Get all team invitations request
 *
 * @param param0
 * @param bearer_token
 * @returns
 */
export function getTeamInvitationsRequest(
	{ teamId, tenantId, organizationId, role }: ITeamInvitationsRequest,
	bearer_token: string
) {
	const query = qs.stringify({
		'where[tenantId]': tenantId,
		'where[organizationId]': organizationId,
		'where[role][name]': role,
		'where[teams][id][0]': teamId,
		'where[status]': 'INVITED'
	});

	return serverFetch<PaginationResponse<TInvite>>({
		path: `/invite?${query}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}

type ResetInviteParams = {
	inviteId: string;
	inviteType: 'TEAM';
	organizationId: string;
	callbackUrl?: string;
	tenantId: string;
};

/**
 *  Resend email invite request
 *
 * @param params
 * @param bearer_token
 * @returns
 */
export function resendInvitationEmailRequest(params: ResetInviteParams, bearer_token: string) {
	return serverFetch<PaginationResponse<TInvite>>({
		path: '/invite/resend',
		method: 'POST',
		body: params,
		bearer_token,
		tenantId: params.tenantId
	});
}

/**
 * Verify invite code request
 *
 * @param params
 * @returns
 */
export function verifyInviteCodeRequest(params: IInviteVerifyCode) {
	return serverFetch<IInviteVerified>({
		path: '/invite/validate-by-code',
		method: 'POST',
		body: params
	});
}

export interface AcceptInviteParams {
	user: {
		firstName: string;
		lastName: string;
		email: string;
	};
	password: string;
	code: string;
	email: string;
}

/**
 * Accept Invite request
 *
 * @param params
 * @returns
 */
export function acceptInviteRequest(params: AcceptInviteParams) {
	return serverFetch<IAuthResponse>({
		path: '/invite/accept',
		method: 'POST',
		body: params
	});
}

/**
 * Get my team invitations request
 *
 * @param param0
 * @param bearer_token
 * @returns
 */
export function getMyInvitationsRequest(tenantId: string, bearer_token: string) {
	return serverFetch<PaginationResponse<TInvite>>({
		path: `/invite/me`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}

export function acceptRejectMyInvitationsRequest(
	tenantId: string,
	bearer_token: string,
	invitationId: string,
	action: EInviteAction
) {
	return serverFetch<PaginationResponse<TInvite>>({
		path: `/invite/${invitationId}/${action}`,
		method: 'PUT',
		bearer_token,
		tenantId: tenantId
	});
}

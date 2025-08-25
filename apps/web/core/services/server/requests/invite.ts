import { IAuthResponse } from '@/core/types/interfaces/auth/auth';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IInviteVerified, IInviteVerifyCode } from '@/core/types/interfaces/user/invite';
import { IInviteCreate } from '@/core/types/interfaces/user/invite';
import { serverFetch } from '../fetch';
import qs from 'qs';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { TInvite } from '@/core/types/schemas';
import { ERoleName } from '@/core/types/generics/enums/role';

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
	role?: ERoleName;
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
	const queryParams: Record<string, string> = {
		'where[tenantId]': tenantId,
		'where[organizationId]': organizationId,
		'where[teams][id][0]': teamId,
		'where[status]': 'INVITED'
	};

	// Only add role filter if role is specified
	if (role) {
		queryParams['where[role][name]'] = role;
	}

	const query = qs.stringify(queryParams);

	return serverFetch<PaginationResponse<TInvite>>({
		path: `/invite?${query}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}

/**
 * WORKAROUND: Get all team invitations by combining EMPLOYEE and non-EMPLOYEE requests
 *
 * This is a temporary solution due to a bug in Gauzy API where:
 * - No role filter = automatically applies `role: { name: Not(RolesEnum.EMPLOYEE) }`
 * - This excludes EMPLOYEE invitations by default
 *
 * TODO: Remove this workaround once Gauzy API is fixed
 */
export async function getAllTeamInvitationsRequest(
	{ teamId, tenantId, organizationId }: Omit<ITeamInvitationsRequest, 'role'>,
	bearer_token: string
): Promise<{ data: PaginationResponse<TInvite> }> {
	try {
		// Execute both requests in parallel for better performance
		const [employeeInvitations, nonEmployeeInvitations] = await Promise.all([
			// Request 1: Get EMPLOYEE invitations explicitly
			getTeamInvitationsRequest({ teamId, tenantId, organizationId, role: ERoleName.EMPLOYEE }, bearer_token),
			// Request 2: Get non-EMPLOYEE invitations (MANAGER, ADMIN, etc.)
			getTeamInvitationsRequest(
				{ teamId, tenantId, organizationId }, // No role = gets non-EMPLOYEE
				bearer_token
			)
		]);

		// Combine results and deduplicate by invitation ID
		const allInvitations = [
			...(employeeInvitations.data.items || []),
			...(nonEmployeeInvitations.data.items || [])
		];

		// Remove duplicates based on invitation ID (safety measure)
		const uniqueInvitations = allInvitations.filter(
			(invitation, index, array) => array.findIndex((inv) => inv.id === invitation.id) === index
		);

		return {
			data: {
				// Preserve other pagination properties from first response
				...employeeInvitations.data,
				// Override with our combined results
				items: uniqueInvitations,
				total: uniqueInvitations.length
			}
		};
	} catch (error) {
		console.error('Error fetching all team invitations:', error);
		// Fallback to empty result
		return {
			data: {
				items: [],
				total: 0
			}
		};
	}
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

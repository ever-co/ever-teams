import { APIService } from '../../../../api.service';
import {
	GAUZY_API_BASE_SERVER_URL,
	INVITE_CALLBACK_PATH,
	INVITE_CALLBACK_URL
} from '@/core/constants/config/constants';
import qs from 'qs';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { AcceptInviteParams } from '@/core/services/server/requests';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IInviteCreate, IInviteVerifyCode } from '@/core/types/interfaces/user/invite';
import { IInviteRequest } from '@/core/types/interfaces/user/invite';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { IAuthResponse } from '@/core/types/interfaces/auth/auth';
import {
	TInvite,
	TInviteVerified,
	validatePaginationResponse,
	validateApiResponse,
	inviteSchema,
	inviteVerifiedSchema,
	ZodValidationError,
	TRole
} from '@/core/types/schemas';
import { inviteResendResultSchema, TInviteResendResult } from '@/core/types/schemas/user/invite.schema';

class InviteService extends APIService {
	inviteByEmails = async (data: IInviteRequest, tenantId: string): Promise<PaginationResponse<TInvite>> => {
		try {
			const endpoint = '/invite/emails';

			if (!GAUZY_API_BASE_SERVER_URL.value) {
				const response = await this.post<PaginationResponse<TInvite>>(endpoint, data, { tenantId });
				return validatePaginationResponse(inviteSchema, response.data, 'inviteByEmails API response');
			}

			const date = new Date();
			date.setDate(date.getDate() - 1);

			const getRoleEndpoint = '/roles/options?name=EMPLOYEE';

			const employeeRole = await this.get<TRole>(getRoleEndpoint, { tenantId });

			const dataToInviteUser: IInviteCreate & { tenantId: string } = {
				emailIds: [data.email],
				projectIds: [],
				departmentIds: [],
				organizationContactIds: [],
				teamIds: [data.teamId],
				roleId: data.roleId || employeeRole.data.id,
				invitationExpirationPeriod: 'Never',
				inviteType: 'TEAM',
				appliedDate: null,
				fullName: data.name,
				callbackUrl: INVITE_CALLBACK_URL,
				organizationId: data.organizationId,
				tenantId,
				startedWorkOn: date.toISOString()
			};

			const response = await this.post<PaginationResponse<TInvite>>(endpoint, dataToInviteUser, { tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(inviteSchema, response.data, 'inviteByEmails API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Invite by emails validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'InviteService'
				);
			}
			throw error;
		}
	};

	getTeamInvitations = async (
		tenantId: string,
		organizationId: string,
		role: string,
		teamId: string
	): Promise<PaginationResponse<TInvite>> => {
		try {
			const query = qs.stringify({
				'where[tenantId]': tenantId,
				'where[organizationId]': organizationId,
				'where[role][name]': role,
				'where[teams][id][0]': teamId,
				'where[status]': 'INVITED'
			});

			const endpoint = `/invite?${query}`;

			const response = await this.get<PaginationResponse<TInvite>>(endpoint, { tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(inviteSchema, response.data, 'getTeamInvitations API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Team invitations validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'InviteService'
				);
			}
			throw error;
		}
	};

	removeTeamInvitations = async (
		invitationId: string,
		tenantId: string,
		organizationId: string,
		role: string,
		teamId: string
	): Promise<PaginationResponse<TInvite>> => {
		try {
			let response = await this.delete<PaginationResponse<TInvite>>(`/invite/${invitationId}`, { tenantId });

			if (GAUZY_API_BASE_SERVER_URL.value) {
				// Use the already validated getTeamInvitations method
				return await this.getTeamInvitations(tenantId, organizationId, role, teamId);
			}

			// Validate the response data using Zod schema
			return validatePaginationResponse(inviteSchema, response.data, 'removeTeamInvitations API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Remove team invitations validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'InviteService'
				);
			}
			throw error;
		}
	};

	/**
	 * Resend team invitation
	 *
	 * @param inviteId - The invitation ID to resend
	 * @returns Promise<TInviteResendResult> - Operation result with affected count
	 * @throws Error if resend fails
	 */
	resendTeamInvitations = async (inviteId: string): Promise<TInviteResendResult> => {
		try {
			const requestData = this.buildResendRequestData(inviteId);
			const response = await this.post<TInviteResendResult>('/invite/resend', requestData);

			// Validate the TypeORM UpdateResult response
			return validateApiResponse(inviteResendResultSchema, response.data, 'resendTeamInvitations API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Resend team invitations validation failed:',
					{
						message: error.message,
						issues: error.issues,
						inviteId
					},
					'InviteService'
				);
			} else {
				this.logger.error(
					'Failed to resend team invitation',
					{
						inviteId,
						error: error instanceof Error ? error.message : 'Unknown error'
					},
					'InviteService'
				);
			}
			throw error;
		}
	};

	/**
	 * Build request data for resend operation based on server configuration
	 */
	private buildResendRequestData(inviteId: string) {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		return GAUZY_API_BASE_SERVER_URL.value
			? {
					tenantId,
					inviteId,
					inviteType: 'TEAM' as const,
					organizationId,
					callbackUrl: INVITE_CALLBACK_URL || `${window.location.origin}${INVITE_CALLBACK_PATH}`
				}
			: { inviteId };
	}

	getMyInvitations = async (tenantId: string): Promise<PaginationResponse<TInvite>> => {
		try {
			const endpoint = '/invite/me';

			const response = await this.get<PaginationResponse<TInvite>>(endpoint, { tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(inviteSchema, response.data, 'getMyInvitations API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Get my invitations validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'InviteService'
				);
			}
			throw error;
		}
	};

	acceptRejectMyInvitations = async (
		invitationId: string,
		action: EInviteAction
	): Promise<TInvite & { message?: string }> => {
		try {
			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/invite/${invitationId}/${action}`
				: `/invite/${invitationId}?action=${action}`;

			const response = await this.put<TInvite & { message?: string }>(endpoint);

			// For this method, we validate the core invite data but allow additional message field
			// If there's a message, return as-is (likely an error response)
			if (response.data.message) {
				return response.data;
			}

			// Validate the invite data using Zod schema
			const validatedInvite = validateApiResponse(
				inviteSchema,
				response.data,
				'acceptRejectMyInvitations API response'
			);
			return validatedInvite as TInvite & { message?: string };
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Accept/reject invitations validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'InviteService'
				);
			}
			throw error;
		}
	};

	acceptInvite = async (params: AcceptInviteParams) => {
		try {
			const res = await this.post<IAuthResponse>('/invite/accept', params);
			return res.data;
		} catch {
			return void 0;
		}
	};

	verifyInviteCode = async (params: IInviteVerifyCode): Promise<TInviteVerified> => {
		try {
			const response = await this.post<TInviteVerified>('/invite/validate-by-code', params);

			// Validate the response data using Zod schema
			return validateApiResponse(inviteVerifiedSchema, response.data, 'verifyInviteCode API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Verify invite code validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'InviteService'
				);
			}
			throw error;
		}
	};
}

export const inviteService = new InviteService(GAUZY_API_BASE_SERVER_URL.value);

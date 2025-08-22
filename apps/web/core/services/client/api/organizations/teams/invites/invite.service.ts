import { APIService } from '../../../../api.service';
import {
	GAUZY_API_BASE_SERVER_URL,
	INVITE_CALLBACK_PATH,
	INVITE_CALLBACK_URL
} from '@/core/constants/config/constants';
import qs from 'qs';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IGetInvitationRequest, IInviteCreate, IInviteVerifyCode } from '@/core/types/interfaces/user/invite';
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
import {
	invitationAcceptedResponse,
	inviteResendResultSchema,
	TAcceptInvitationRequest,
	TInviteResendResult,
	TValidateInviteRequest
} from '@/core/types/schemas/user/invite.schema';

class InviteService extends APIService {
	inviteByEmails = async (data: IInviteRequest): Promise<PaginationResponse<TInvite>> => {
		try {
			const endpoint = '/invite/emails';

			if (!GAUZY_API_BASE_SERVER_URL.value) {
				const response = await this.post<PaginationResponse<TInvite>>(endpoint, data, {
					tenantId: this.tenantId
				});
				return validatePaginationResponse(inviteSchema, response.data, 'inviteByEmails API response');
			}

			const date = new Date();
			date.setDate(date.getDate() - 1);

			const getRoleEndpoint = '/roles/options?name=EMPLOYEE';

			const employeeRoleId = await this.get<TRole>(getRoleEndpoint, { tenantId: this.tenantId }).then(
				(res) => res.data.id
			);

			const dataToInviteUser: IInviteCreate & { tenantId: string } = {
				emailIds: [data.email],
				projectIds: [],
				departmentIds: [],
				organizationContactIds: [],
				teamIds: [data.teamId],
				roleId: data.roleId || employeeRoleId,
				invitationExpirationPeriod: 'Never',
				inviteType: 'TEAM',
				appliedDate: null,
				fullName: data.name,
				callbackUrl: INVITE_CALLBACK_URL,
				organizationId: data.organizationId,
				tenantId: this.tenantId,
				startedWorkOn: date.toISOString()
			};

			const response = await this.post<PaginationResponse<TInvite>>(endpoint, dataToInviteUser, {
				tenantId: this.tenantId
			});

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

	getTeamInvitations = async (requestParams: IGetInvitationRequest): Promise<PaginationResponse<TInvite>> => {
		try {
			// Base queries
			const query: Record<string, string> = {
				'where[tenantId]': this.tenantId,
				'where[organizationId]': this.organizationId
			};

			const { role, teamId, ...remainingParams } = requestParams;

			(Object.keys(remainingParams) as (keyof typeof remainingParams)[]).forEach((key) => {
				if (remainingParams[key]) {
					query[`where[${key}]`] = remainingParams[key];
				}
			});

			if (role) {
				query['where[role][name]'] = role;
			}
			if (teamId) {
				query['where[teams][id][0]'] = teamId;
			}

			const endpoint = `/invite?${qs.stringify(query)}`;

			const response = await this.get<PaginationResponse<TInvite>>(endpoint, { tenantId: this.tenantId });

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

	removeTeamInvitations = async ({
		invitationId,
		role,
		teamId
	}: {
		invitationId: string;
		role: string;
		teamId: string;
	}): Promise<PaginationResponse<TInvite>> => {
		try {
			let response = await this.delete<PaginationResponse<TInvite>>(`/invite/${invitationId}`, {
				tenantId: this.tenantId
			});

			if (GAUZY_API_BASE_SERVER_URL.value) {
				// Use the already validated getTeamInvitations method
				return await this.getTeamInvitations({
					role,
					teamId
				});
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
		const tenantId = this.tenantId;
		const organizationId = this.organizationId;

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

	getMyInvitations = async (): Promise<PaginationResponse<TInvite>> => {
		try {
			const endpoint = '/invite/me';

			const response = await this.get<PaginationResponse<TInvite>>(endpoint, { tenantId: this.tenantId });

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

	acceptInvite = async (data: TAcceptInvitationRequest) => {
		try {
			const res = await this.post<IAuthResponse>('/invite/accept', data, {}, false);

			// Validate the response data using Zod schema
			return validateApiResponse(invitationAcceptedResponse, res.data, 'acceptInvite API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Accept invite validation failed:',
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

	validateInvitationByCodeAndEmail = async (params: IInviteVerifyCode): Promise<TInviteVerified> => {
		try {
			const response = await this.post<TInviteVerified>('/invite/validate-by-code', params);

			// Validate the response data using Zod schema
			return validateApiResponse(
				inviteVerifiedSchema,
				response.data,
				'validateInvitationByCodeAndEmail API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Validate invitation by code and email validation failed:',
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

	validateInviteByTokenAndEmail = async (query: TValidateInviteRequest): Promise<TInvite> => {
		try {
			const response = await this.get<TInvite>(`/invite/validate?email=${query.email}&token=${query.token}`);

			// Validate the response data using Zod schema
			return validateApiResponse(inviteSchema, response.data, 'validateInvitationByTokenAndEmail API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Validate invitation by token and email validation failed:',
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

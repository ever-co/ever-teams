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
	ZodValidationError
} from '@/core/types/schemas';

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

			const employeeRole = await this.get<any>(getRoleEndpoint, { tenantId });

			const dataToInviteUser: IInviteCreate & { tenantId: string } = {
				emailIds: [data.email],
				projectIds: [],
				departmentIds: [],
				organizationContactIds: [],
				teamIds: [data.teamId],
				roleId: employeeRole.data.id || '',
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

	resendTeamInvitations = async (inviteId: string): Promise<PaginationResponse<TInvite>> => {
		try {
			const tenantId = getTenantIdCookie();
			const organizationId = getOrganizationIdCookie();

			const callbackUrl = INVITE_CALLBACK_URL || `${window.location.origin}${INVITE_CALLBACK_PATH}`;

			const localData = {
				tenantId,
				inviteId,
				inviteType: 'TEAM',
				organizationId,
				callbackUrl: INVITE_CALLBACK_URL || callbackUrl
			};

			const nData = {
				inviteId
			};

			const data = GAUZY_API_BASE_SERVER_URL.value ? localData : nData;

			const response = await this.post<PaginationResponse<TInvite>>(`/invite/resend`, data);

			// Validate the response data using Zod schema
			return validatePaginationResponse(inviteSchema, response.data, 'resendTeamInvitations API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Resend team invitations validation failed:',
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

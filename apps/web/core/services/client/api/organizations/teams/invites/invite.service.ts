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
import { EInviteAction, EInviteStatus } from '@/core/types/generics/enums/invite';
import { IAuthResponse } from '@/core/types/interfaces/auth/auth';
import {
	TInvite,
	TInviteVerified,
	validatePaginationResponse,
	validateApiResponse,
	inviteSchema,
	inviteVerifiedSchema,
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
		const endpoint = '/invite/emails';

		if (!GAUZY_API_BASE_SERVER_URL.value) {
			return this.executeWithPaginationValidation(
				() => this.post<PaginationResponse<TInvite>>(endpoint, data, { tenantId: this.tenantId }),
				(responseData) => validatePaginationResponse(inviteSchema, responseData, 'inviteByEmails API response'),
				{ method: 'inviteByEmails', service: 'InviteService' }
			);
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

		return this.executeWithPaginationValidation(
			() => this.post<PaginationResponse<TInvite>>(endpoint, dataToInviteUser, { tenantId: this.tenantId }),
			(responseData) => validatePaginationResponse(inviteSchema, responseData, 'inviteByEmails API response'),
			{ method: 'inviteByEmails', service: 'InviteService' }
		);
	};

	/**
	 * Get team invitations with optional role filtering
	 *
	 * Now that the Gauzy API bug is fixed, we can:
	 * - Get all invitations by not specifying roles (returns all roles by default)
	 * - Filter by specific roles by passing a roles array
	 */
	getTeamInvitations = async (requestParams: IGetInvitationRequest): Promise<PaginationResponse<TInvite>> => {
		const { teamId, roles, ...remainingParams } = requestParams;

		const baseQuery: Record<string, any> = {
			'where[tenantId]': this.tenantId,
			'where[organizationId]': this.organizationId,
			'where[status]': EInviteStatus.INVITED
		};

		if (teamId) {
			baseQuery['where[teams][id][0]'] = teamId;
		}

		// Add role filter if roles are specified
		if (roles && roles.length > 0) {
			if (roles.length === 1) {
				// Single role filter
				baseQuery['where[role][name]'] = roles[0];
			} else {
				// Multiple roles filter - use array format
				roles.forEach((role, index) => {
					baseQuery[`where[role][name][${index}]`] = role;
				});
			}
		}

		// Add remaining params
		(Object.keys(remainingParams) as (keyof typeof remainingParams)[]).forEach((key) => {
			if (remainingParams[key]) {
				baseQuery[`where[${key}]`] = remainingParams[key] as string;
			}
		});

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TInvite>>(`/invite?${qs.stringify(baseQuery)}`, { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(inviteSchema, data, 'getTeamInvitations API response'),
			{ method: 'getTeamInvitations', service: 'InviteService', teamId }
		);
	};

	removeTeamInvitations = async ({
		invitationId,
		teamId
	}: {
		invitationId: string;
		teamId: string;
	}): Promise<PaginationResponse<TInvite>> => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.delete<PaginationResponse<TInvite>>(`/invite/${invitationId}`, { tenantId: this.tenantId });
			return this.getTeamInvitations({ teamId });
		}

		return this.executeWithPaginationValidation(
			() => this.delete<PaginationResponse<TInvite>>(`/invite/${invitationId}`, { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(inviteSchema, data, 'removeTeamInvitations API response'),
			{ method: 'removeTeamInvitations', service: 'InviteService', invitationId, teamId }
		);
	};

	/**
	 * Resend team invitation
	 *
	 * @param inviteId - The invitation ID to resend
	 * @returns Promise<TInviteResendResult> - Operation result with affected count
	 * @throws Error if resend fails
	 */
	resendTeamInvitations = async (inviteId: string): Promise<TInviteResendResult> => {
		const requestData = this.buildResendRequestData(inviteId);

		return this.executeWithValidation(
			() => this.post<TInviteResendResult>('/invite/resend', requestData),
			(responseData) => validateApiResponse(inviteResendResultSchema, responseData, 'resendTeamInvitations API response'),
			{ method: 'resendTeamInvitations', service: 'InviteService', inviteId }
		);
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
		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TInvite>>('/invite/me', { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(inviteSchema, data, 'getMyInvitations API response'),
			{ method: 'getMyInvitations', service: 'InviteService' }
		);
	};

	acceptRejectMyInvitations = async (
		invitationId: string,
		action: EInviteAction
	): Promise<TInvite & { message?: string }> => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/invite/${invitationId}/${action}`
			: `/invite/${invitationId}?action=${action}`;

		return this.executeWithValidation(
			() => this.put<TInvite & { message?: string }>(endpoint),
			(data) => {
				if (data.message) {
					return data;
				}
				return validateApiResponse(inviteSchema, data, 'acceptRejectMyInvitations API response') as TInvite & { message?: string };
			},
			{ method: 'acceptRejectMyInvitations', service: 'InviteService', invitationId, action }
		);
	};

	acceptInvite = async (data: TAcceptInvitationRequest) => {
		return this.executeWithValidation(
			() => this.post<IAuthResponse>('/invite/accept', data, {}, false),
			(responseData) => validateApiResponse(invitationAcceptedResponse, responseData, 'acceptInvite API response'),
			{ method: 'acceptInvite', service: 'InviteService' }
		);
	};

	validateInvitationByCodeAndEmail = async (params: IInviteVerifyCode): Promise<TInviteVerified> => {
		return this.executeWithValidation(
			() => this.post<TInviteVerified>('/invite/validate-by-code', params),
			(responseData) => validateApiResponse(inviteVerifiedSchema, responseData, 'validateInvitationByCodeAndEmail API response'),
			{ method: 'validateInvitationByCodeAndEmail', service: 'InviteService' }
		);
	};

	validateInviteByTokenAndEmail = async (query: TValidateInviteRequest): Promise<TInvite> => {
		return this.executeWithValidation(
			() => this.get<TInvite>(`/invite/validate?email=${query.email}&token=${query.token}`),
			(data) => validateApiResponse(inviteSchema, data, 'validateInvitationByTokenAndEmail API response'),
			{ method: 'validateInviteByTokenAndEmail', service: 'InviteService' }
		);
	};
}

export const inviteService = new InviteService(GAUZY_API_BASE_SERVER_URL.value);

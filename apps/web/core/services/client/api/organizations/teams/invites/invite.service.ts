import { APIService } from '../../../../api.service';
import {
	GAUZY_API_BASE_SERVER_URL,
	INVITE_CALLBACK_PATH,
	INVITE_CALLBACK_URL
} from '@/core/constants/config/constants';
import qs from 'qs';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { AcceptInviteParams } from '@/core/services/server/requests';
import { PaginationResponse } from '@/core/types/interfaces/to-review/IDataResponse';
import { IInvite, IInviteCreate, IInviteVerified, IInviteVerifyCode } from '@/core/types/interfaces/user/IInvite';
import { IInviteRequest } from '@/core/types/interfaces/user/IInvite';
import { InviteActionEnum } from '@/core/types/enums/invite';
import { IAuthResponse } from '@/core/types/interfaces/to-review/auth/IAuth';

class InviteService extends APIService {
	inviteByEmails = async (data: IInviteRequest, tenantId: string) => {
		const endpoint = '/invite/emails';

		if (!GAUZY_API_BASE_SERVER_URL.value) {
			return this.post<PaginationResponse<IInvite>>(endpoint, data, { tenantId });
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

		// for not direct call we need to adjust data to include name and email only

		return this.post<PaginationResponse<IInvite>>(endpoint, dataToInviteUser, { tenantId });
	};

	getTeamInvitations = async (tenantId: string, organizationId: string, role: string, teamId: string) => {
		const query = qs.stringify({
			'where[tenantId]': tenantId,
			'where[organizationId]': organizationId,
			'where[role][name]': role,
			'where[teams][id][0]': teamId,
			'where[status]': 'INVITED'
		});

		const endpoint = `/invite?${query}`;

		return this.get<PaginationResponse<IInvite>>(endpoint, { tenantId });
	};

	removeTeamInvitations = async (
		invitationId: string,
		tenantId: string,
		organizationId: string,
		role: string,
		teamId: string
	) => {
		let response = await this.delete<PaginationResponse<IInvite>>(`/invite/${invitationId}`, { tenantId });

		if (GAUZY_API_BASE_SERVER_URL.value) {
			response = await this.getTeamInvitations(tenantId, organizationId, role, teamId);
		}

		return response;
	};

	resendTeamInvitations = async (inviteId: string) => {
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

		return this.post<PaginationResponse<IInvite>>(`/invite/resend`, data);
	};

	getMyInvitations = async (tenantId: string) => {
		const endpoint = '/invite/me';

		return this.get<PaginationResponse<IInvite>>(endpoint, { tenantId });
	};

	acceptRejectMyInvitations = async (invitationId: string, action: InviteActionEnum) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/invite/${invitationId}/${action}`
			: `/invite/${invitationId}?action=${action}`;

		return this.put<IInvite & { message?: string }>(endpoint);
	};

	acceptInvite = async (params: AcceptInviteParams) => {
		try {
			const res = await this.post<IAuthResponse>('/invite/accept', params);
			return res.data;
		} catch {
			return void 0;
		}
	};

	verifyInviteCode = async (params: IInviteVerifyCode) => {
		const res = await this.post<IInviteVerified>('/invite/validate-by-code', params);
		return res.data;
	};
}

export const inviteService = new InviteService(GAUZY_API_BASE_SERVER_URL.value);

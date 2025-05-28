import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '@/core/services/client/api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IJoinTeamRequest } from '@/core/types/interfaces/team/request-to-join';
import { IDataResponse, ISuccessResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IJoinTeamResponse, IValidateRequestToJoinTeam } from '@/core/types/interfaces/team/request-to-join';
import { ERequestStatus } from '@/core/types/interfaces/enums';

class RequestToJoinTeamService extends APIService {
	getRequestToJoin = async () => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const query = qs.stringify({
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId
		});

		return this.get<PaginationResponse<IJoinTeamResponse>>(`/organization-team-join?${query}`);
	};

	requestToJoin = async (data: IJoinTeamRequest) => {
		const endpoint = '/organization-team-join';
		return this.post<IJoinTeamResponse>(endpoint, data);
	};

	validateRequestToJoin = async (data: IValidateRequestToJoinTeam) => {
		return this.post<Pick<IJoinTeamResponse, 'email' | 'organizationTeamId'>>(
			'/organization-team-join/validate',
			data
		);
	};

	resendCodeRequestToJoin = async (data: IJoinTeamRequest) => {
		return this.post<IDataResponse<ISuccessResponse>>('/organization-team-join/resend-code', data);
	};

	acceptRejectRequestToJoin = async (id: string, action: ERequestStatus) => {
		return this.put<PaginationResponse<IJoinTeamResponse>>(`/organization-team-join/${id}/${action}`);
	};
}

export const requestToJoinTeamService = new RequestToJoinTeamService(GAUZY_API_BASE_SERVER_URL.value);

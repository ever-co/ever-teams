import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import { IOrganizationTeam, IOrganizationTeamEmployeeUpdate } from '@/core/types/interfaces';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class OrganizationTeamEmployeeService extends APIService {
	deleteOrganizationEmployeeTeam = async ({
		id,
		employeeId,
		organizationId,
		tenantId
	}: {
		id: string;
		employeeId: string;
		organizationId: string;
		tenantId: string;
	}) => {
		const teamId = getActiveTeamIdCookie();

		return this.delete<IOrganizationTeam>(
			`/organization-team-employee/${id}?tenantId=${tenantId}&employeeId=${employeeId}&organizationId=${organizationId}&organizationTeamId=${teamId}`
		);
	};

	updateOrganizationEmployeeTeam = async (id: string, data: Partial<IOrganizationTeamEmployeeUpdate>) => {
		return this.put<IOrganizationTeamEmployeeUpdate>(`/organization-team-employee/${id}`, data);
	};

	updateOrganizationTeamEmployeeActiveTask = async (id: string, data: Partial<IOrganizationTeamEmployeeUpdate>) => {
		return this.put<IOrganizationTeamEmployeeUpdate>(`/organization-team-employee/${id}/active-task`, data);
	};
}

export const organizationTeamEmployeeService = new OrganizationTeamEmployeeService(GAUZY_API_BASE_SERVER_URL.value);

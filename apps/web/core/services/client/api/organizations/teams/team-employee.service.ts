import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { IOrganizationTeam, IOrganizationTeamEmployeeUpdate, OT_Member } from '@/core/types/interfaces/to-review';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';

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

	removeEmployeeOrganizationTeam = async (employeeId: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/organization-team-employee/${employeeId}`
			: `/organization-team/employee/${employeeId}`;

		return this.delete<boolean>(endpoint);
	};

	editEmployeeOrderOrganizationTeam = async (
		employeeId: string,
		data: { order: number; organizationTeamId: string; organizationId: string },
		tenantId?: string
	) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/organization-team-employee/${employeeId}`
			: `/organization-team/employee/${employeeId}`;

		return this.put<OT_Member>(endpoint, data, { tenantId });
	};
}

export const organizationTeamEmployeeService = new OrganizationTeamEmployeeService(GAUZY_API_BASE_SERVER_URL.value);

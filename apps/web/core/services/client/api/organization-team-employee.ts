import { IOrganizationTeamEmployeeUpdate } from '@/core/types/interfaces';
import { IOrganizationTeam } from '@/core/types/interfaces/IOrganizationTeam';
import { deleteApi, put } from '../axios';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/index';

export function deleteOrganizationEmployeeTeamAPI({
	id,
	employeeId,
	organizationId,
	tenantId
}: {
	id: string;
	employeeId: string;
	organizationId: string;
	tenantId: string;
}) {
	const teamId = getActiveTeamIdCookie();

	return deleteApi<IOrganizationTeam>(
		`/organization-team-employee/${id}?tenantId=${tenantId}&employeeId=${employeeId}&organizationId=${organizationId}&organizationTeamId=${teamId}`
	);
}

export function updateOrganizationEmployeeTeamAPI(id: string, data: Partial<IOrganizationTeamEmployeeUpdate>) {
	return put<IOrganizationTeamEmployeeUpdate>(`/organization-team-employee/${id}`, data);
}

export function updateOrganizationTeamEmployeeActiveTaskAPI(
	id: string,
	data: Partial<IOrganizationTeamEmployeeUpdate>
) {
	return put<IOrganizationTeamEmployeeUpdate>(`/organization-team-employee/${id}/active-task`, data);
}

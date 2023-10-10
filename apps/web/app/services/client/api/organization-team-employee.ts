import { IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import { CreateReponse } from '@app/interfaces/IDataResponse';
import { IOrganizationTeam } from '@app/interfaces/IOrganizationTeam';
import api from '../axios';

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
	return api.delete<CreateReponse<IOrganizationTeam>>(
		`/organization-team-employee/${id}?tenantId=${tenantId}&employeeId=${employeeId}&organizationId=${organizationId}`
	);
}

export function updateOrganizationEmployeeTeamAPI(
	id: string,
	data: Partial<IOrganizationTeamEmployeeUpdate>
) {
	return api.put<CreateReponse<IOrganizationTeamEmployeeUpdate>>(
		`/organization-team-employee/${id}`,
		data
	);
}

export function updateOrganizationTeamEmployeeActiveTaskAPI(
	id: string,
	data: Partial<IOrganizationTeamEmployeeUpdate>
) {
	return api.put<CreateReponse<IOrganizationTeamEmployeeUpdate>>(
		`/organization-team-employee/${id}/active-task`,
		data
	);
}

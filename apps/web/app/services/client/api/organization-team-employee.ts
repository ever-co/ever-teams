import { CreateReponse } from '@app/interfaces/IDataResponse';
import { IOrganizationTeam } from '@app/interfaces/IOrganizationTeam';
import api from '../axios';

export function deleteOrganizationEmployeeTeamAPI({
	id,
	employeeId,
	organizationId,
	tenantId,
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

import { IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import { serverFetch } from '../fetch';

export function deleteOrganizationTeamEmployeeRequest({
	id,
	bearer_token,
	tenantId,
	organizationId,
	employeeId,
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	employeeId: string;
}) {
	return serverFetch<IOrganizationTeamEmployeeUpdate>({
		path: `/organization-team-employee/${id}?tenantId=${tenantId}&employeeId=${employeeId}&organizationId=${organizationId}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}

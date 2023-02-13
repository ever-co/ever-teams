import { IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import { serverFetch } from '../fetch';

export function deleteOrganizationTeamEmployeeRequest({
	id,
	bearer_token,
	tenantId,
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IOrganizationTeamEmployeeUpdate>({
		path: `/organization-team-employee/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}

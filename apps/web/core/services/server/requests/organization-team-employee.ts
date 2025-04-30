import { IOrganizationTeamEmployeeUpdate } from '@/core/types/interfaces';
import { serverFetch } from '../fetch';

export function deleteOrganizationTeamEmployeeRequest({
	id,
	bearer_token,
	tenantId,
	organizationId,
	employeeId,
	organizationTeamId
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	employeeId: string;
	organizationTeamId: string;
}) {
	return serverFetch<IOrganizationTeamEmployeeUpdate>({
		path: `/organization-team-employee/${id}?tenantId=${tenantId}&employeeId=${employeeId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function updateOrganizationTeamEmployeeRequest({
	id,
	bearer_token,
	tenantId,
	body
}: {
	id: string;
	bearer_token: string;
	tenantId: string;

	body: IOrganizationTeamEmployeeUpdate;
}) {
	return serverFetch<IOrganizationTeamEmployeeUpdate>({
		path: `/organization-team-employee/${id}`,
		method: 'PUT',
		bearer_token,
		tenantId,
		body
	});
}

export function updateOrganizationTeamEmployeeActiveTaskRequest({
	id,
	bearer_token,
	tenantId,
	body
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
	body: IOrganizationTeamEmployeeUpdate;
}) {
	return serverFetch<IOrganizationTeamEmployeeUpdate>({
		path: `/organization-team-employee/${id}/active-task`,
		method: 'PUT',
		bearer_token,
		tenantId,
		body
	});
}

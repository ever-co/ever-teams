import { ICreateEmployee, IEmployee, IUpdateEmployee } from '@/core/types/interfaces/organization/employee';
import { serverFetch } from '../fetch';
import qs from 'qs';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';

export function createEmployeeFromUser(data: ICreateEmployee, bearer_token: string) {
	return serverFetch<IEmployee>({
		path: '/employee',
		method: 'POST',
		bearer_token,
		body: data,
		tenantId: data.tenantId
	});
}

/**
 * Get organization employees using /employee/members endpoint
 * Migrated from /employee/pagination to /employee/members for better security reasons
 * @param bearer_token - Auth token
 * @param tenantId - Tenant UUID
 * @param organizationId - Organization UUID
 * @param organizationTeamId - Optional team UUID to filter by specific team
 * @returns Paginated list of employees
 */
export function getOrganizationEmployees(
	bearer_token: string,
	tenantId: string,
	organizationId: string,
	organizationTeamId?: string
) {
	const params: Record<string, any> = {
		organizationId: organizationId,
		tenantId: tenantId,
		'relations[0]': 'user'
	};

	// Filter by team if provided (correct parameter name: organizationTeamId, NOT teamId)
	if (organizationTeamId) {
		params.organizationTeamId = organizationTeamId;
	}

	const query = qs.stringify(params);

	return serverFetch<PaginationResponse<IEmployee>>({
		path: `/employee/members?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function updateEmployees({
	bearer_token,
	id,
	body
}: {
	bearer_token: string;
	id: string;
	body: IUpdateEmployee;
}) {
	return serverFetch<IEmployee>({
		path: `/employee/${id}`,
		method: 'PUT',
		bearer_token,
		body
	});
}

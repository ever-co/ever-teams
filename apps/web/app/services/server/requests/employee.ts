import { ICreateEmployee, IEmployee } from '@app/interfaces/IEmployee';
import { serverFetch } from '../fetch';

export function createEmployeeFromUser(
	data: ICreateEmployee,
	bearer_token: string
) {
	return serverFetch<IEmployee>({
		path: '/employee',
		method: 'POST',
		bearer_token,
		body: data,
		tenantId: data.tenantId,
	});
}

export function getOrganizationEmployees(
	bearer_token: string,
	tenantId: string,
	organizationId: string
) {
	const params = {
		'where[tenantId]': tenantId,
		'where[organizationId]': organizationId,
		'relations[0]': 'user',
	};
	const query = new URLSearchParams(params);
	return serverFetch<IEmployee>({
		path: `/employee/pagination?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId,
	});
}

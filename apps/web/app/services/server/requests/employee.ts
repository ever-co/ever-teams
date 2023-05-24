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
		data: JSON.stringify({
			findInput: { organizationId, withUser: true },
		}),
	};
	const query = new URLSearchParams(params);
	return serverFetch<IEmployee>({
		path: `/employee/working?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId,
	});
}

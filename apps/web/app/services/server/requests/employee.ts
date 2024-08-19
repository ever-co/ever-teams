import { PaginationResponse } from '@app/interfaces';
import { ICreateEmployee, IEmployee, IUpdateEmployee, IWorkingEmployee } from '@app/interfaces/IEmployee';
import { serverFetch } from '../fetch';
import qs from 'qs';

export function createEmployeeFromUser(data: ICreateEmployee, bearer_token: string) {
	return serverFetch<IEmployee>({
		path: '/employee',
		method: 'POST',
		bearer_token,
		body: data,
		tenantId: data.tenantId
	});
}

export function getOrganizationEmployees(bearer_token: string, tenantId: string, organizationId: string) {
	const params = {
		'where[tenantId]': tenantId,
		'where[organizationId]': organizationId,
		'relations[0]': 'user'
	};

	const query = qs.stringify(params);

	return serverFetch<PaginationResponse<IWorkingEmployee>>({
		path: `/employee/pagination?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function updateEmployees({ bearer_token, id, body }: { bearer_token: string, id: string, body: IUpdateEmployee }) {
	return serverFetch<IEmployee>({
		path: `/employee/${id}`,
		method: 'PUT',
		bearer_token,
		body

	})
}

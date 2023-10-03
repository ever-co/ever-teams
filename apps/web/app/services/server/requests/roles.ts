import { IRole } from '@app/interfaces/IEmployee';
import { serverFetch } from '../fetch';

export function getEmployeeRoleRequest({
	bearer_token,
	role,
	tenantId
}: {
	bearer_token: string;
	role: 'EMPLOYEE';
	tenantId: string;
}) {
	return serverFetch<IRole>({
		path: `/roles/options?name=${role}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function getRolesRequest({
	bearer_token,
	tenantId
}: {
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IRole>({
		path: `/roles`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function createRoleRequest({
	bearer_token,
	tenantId,
	data
}: {
	data: IRole;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IRole>({
		path: `/roles`,
		method: 'POST',
		bearer_token,
		tenantId,
		body: data
	});
}

export function deleteRoleRequest({
	bearer_token,
	tenantId,
	id
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IRole>({
		path: `/roles/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function updateRoleRequest({
	bearer_token,
	tenantId,
	data
}: {
	data: IRole;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IRole>({
		path: `/roles/${data.id}`,
		method: 'PUT',
		bearer_token,
		tenantId,
		body: data
	});
}

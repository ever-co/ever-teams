import { IRole } from '../../interfaces/IEmployee';
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

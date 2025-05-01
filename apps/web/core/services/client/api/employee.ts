import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IUpdateEmployee, IWorkingEmployee, PaginationResponse } from '@/core/types/interfaces';
import { get, put } from '../axios';
import qs from 'qs';

export async function getWorkingEmployeesAPI(tenantId: string, organizationId: string) {
	const params = {
		'where[tenantId]': tenantId,
		'where[organizationId]': organizationId,
		'relations[0]': 'user'
	};
	const query = qs.stringify(params);

	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/employee/pagination?${query}` : '/employee/working';

	return get<PaginationResponse<IWorkingEmployee>>(endpoint, { tenantId });
}

export function updateEmployeeAPI({ id, data }: { id: string; data: IUpdateEmployee }) {
	return put<IUpdateEmployee>(`/employee/${id}`, data);
}

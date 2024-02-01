import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { IWorkingEmployee, PaginationResponse } from '@app/interfaces';
import { get } from '../axios';

export async function getWorkingEmployeesAPI(tenantId: string, organizationId: string) {
	const params = {
		'where[tenantId]': tenantId,
		'where[organizationId]': organizationId,
		'relations[0]': 'user'
	};
	const query = new URLSearchParams(params);

	const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/employee/pagination?${query.toString()}` : '/employee/working';

	return get<PaginationResponse<IWorkingEmployee>>(endpoint, { tenantId });
}
